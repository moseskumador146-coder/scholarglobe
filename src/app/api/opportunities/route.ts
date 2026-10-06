import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeCycle } from "@/lib/opportunity-status";

export const dynamic = "force-dynamic";

const CONTINENTS = ["Africa", "Europe", "Asia", "Middle East", "North America", "South America", "Oceania"];

/**
 * GET /api/opportunities
 * Filters:
 *  - destination:   "all" | continent name | country name
 *  - level:         "all" | undergraduate | masters | phd
 *  - field:         "any" | one of FIELDS
 *  - freeOnly:      "1" → only feeConfirmedFree
 *  - moiOnly:       "1" → only MOI-accepted (English waiver)
 *  - status:        "all" | OPEN | UPCOMING
 *  - q:             free text search in name/provider/fields
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const destination = sp.get("destination") ?? "all";
  const level = sp.get("level") ?? "all";
  const field = sp.get("field") ?? "any";
  const freeOnly = sp.get("freeOnly") === "1";
  const moiOnly = sp.get("moiOnly") === "1";
  const statusFilter = sp.get("status") ?? "all";
  const q = (sp.get("q") ?? "").trim().toLowerCase();

  const where: Record<string, unknown> = {};
  if (destination !== "all") {
    if (CONTINENTS.includes(destination)) {
      where.continent = destination;
    } else {
      where.country = destination;
    }
  }
  if (freeOnly) where.feeConfirmedFree = true;
  if (moiOnly) where.moiAccepted = true;

  const rows = await db.opportunity.findMany({ where });

  const now = new Date();
  let results = rows
    .map((r) => {
      const cycle = computeCycle(r, now);
      return { ...r, cycle };
    })
    .filter((r) => {
      const cycle = r.cycle;
      if (statusFilter === "OPEN" && !["OPEN", "ROLLING"].includes(cycle.status)) return false;
      if (statusFilter === "UPCOMING" && cycle.status !== "UPCOMING") return false;
      if (level !== "all" && !r.levels.split(",").includes(level)) return false;
      if (field !== "any" && field !== "all") {
        const fields = r.fields.split("|").map((f) => f.trim().toLowerCase());
        if (!fields.includes("any") && !fields.includes(field)) return false;
      }
      if (q) {
        const hay = `${r.name} ${r.provider} ${r.country} ${r.fields.replace(/\|/g, " ")} ${r.requirementsSummary ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .map((r) => {
      let stepsCount = 0;
      try {
        stepsCount = (JSON.parse(r.applicationSteps) as unknown[]).length;
      } catch {
        stepsCount = 0;
      }
      return { ...r, stepsCount };
    });

  // Sort: OPEN first (by soonest close), then ROLLING, UPCOMING (by soonest open), then CLOSED
  const order: Record<string, number> = { OPEN: 0, ROLLING: 1, UPCOMING: 2, CLOSED: 3 };
  results.sort((a, b) => {
    const ca = a.cycle;
    const cb = b.cycle;
    const oa = order[ca.status] ?? 4;
    const ob = order[cb.status] ?? 4;
    if (oa !== ob) return oa - ob;
    const da = ca.nextClose ?? ca.nextOpen ?? "9999";
    const dbb = cb.nextClose ?? cb.nextOpen ?? "9999";
    return da.localeCompare(dbb);
  });

  return NextResponse.json({
    count: results.length,
    results,
  });
}
