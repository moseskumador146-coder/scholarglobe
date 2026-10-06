import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeCycle, CONTINENT_COLORS } from "@/lib/opportunity-status";

export const dynamic = "force-dynamic";

interface GlobePoint {
  lat: number;
  lng: number;
  name: string;
  country: string;
  countryCode: string;
  continent: string;
  color: string;
  /** number of matching opportunities */
  size: number;
  /** for status globe: dominant status */
  status?: string;
}

/**
 * GET /api/globe?type=universities|scholarships|status
 * Returns per-country aggregated points for the 3 globes.
 */
export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type") ?? "universities";
  const rows = await db.opportunity.findMany();
  const now = new Date();

  // group by country
  const byCountry = new Map<string, { rows: typeof rows; lat: number; lng: number }>();
  for (const r of rows) {
    if (type === "universities" && r.kind !== "UNIVERSITY") continue;
    if (type === "scholarships" && r.kind !== "SCHOLARSHIP") continue;
    const existing = byCountry.get(r.country);
    if (existing) {
      existing.rows.push(r);
    } else {
      byCountry.set(r.country, { rows: [r], lat: r.lat, lng: r.lng });
    }
  }

  const points: GlobePoint[] = [];
  for (const [country, { rows: rs, lat, lng }] of byCountry) {
    const first = rs[0];
    if (type === "status") {
      // dominant status: OPEN > ROLLING > UPCOMING > CLOSED
      const statuses = rs.map((r) => computeCycle(r, now).status);
      const priority: Record<string, number> = { OPEN: 0, ROLLING: 1, UPCOMING: 2, CLOSED: 3 };
      statuses.sort((a, b) => priority[a] - priority[b]);
      const dominant = statuses[0];
      const color =
        dominant === "OPEN" ? "#10b981" : dominant === "ROLLING" ? "#34d399" : dominant === "UPCOMING" ? "#f59e0b" : "#6b7280";
      points.push({
        lat,
        lng,
        name: `${country} — ${rs.length} opportunit${rs.length === 1 ? "y" : "ies"} (${dominant === "ROLLING" ? "ROLLING" : dominant})`,
        country,
        countryCode: first.countryCode,
        continent: first.continent,
        color,
        size: rs.length,
        status: dominant,
      });
    } else {
      points.push({
        lat,
        lng,
        name: `${country} — ${rs.length} ${type === "universities" ? "universit" + (rs.length === 1 ? "y" : "ies") : "scholarship" + (rs.length === 1 ? "" : "s")}`,
        country,
        countryCode: first.countryCode,
        continent: first.continent,
        color: CONTINENT_COLORS[first.continent] ?? "#ffffff",
        size: rs.length,
      });
    }
  }

  return NextResponse.json({ points });
}
