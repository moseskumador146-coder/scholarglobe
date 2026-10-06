import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeCycle } from "@/lib/opportunity-status";

export const dynamic = "force-dynamic";

const CONTINENTS = ["Africa", "Europe", "Asia", "Middle East", "North America", "South America", "Oceania"];

type Row = {
  id: string;
  name: string;
  slug: string;
  kind: string;
  provider: string;
  country: string;
  countryCode: string;
  continent: string;
  city: string | null;
  lat: number;
  lng: number;
  levels: string;
  fields: string;
  feeAmount: number;
  feeCurrency: string;
  feeConfirmedFree: boolean;
  feeUsdApprox: number | null;
  feeNote: string | null;
  relatedSlugs: string;
  fundingType: string;
  fundingNote: string | null;
  opensMonth: number | null;
  opensDay: number | null;
  closesMonth: number | null;
  closesDay: number | null;
  rolling: boolean;
  cycleNote: string | null;
  moiAccepted: boolean;
  moiNote: string | null;
  englishTests: string | null;
  localLanguageRequired: boolean;
  localLanguageNote: string | null;
  recommendationsRequired: boolean;
  recommendationsCount: number | null;
  recommendationsNote: string | null;
  unofficialTranscripts: boolean;
  transcriptsNote: string | null;
  essayRequired: boolean;
  essayNote: string | null;
  applicationSteps: string;
  requirementsSummary: string | null;
  eligibilityNote: string | null;
  officialUrl: string;
  competitiveNote: string | null;
  successTips: string | null;
};

function feeUsd(r: Row): number {
  if (r.feeConfirmedFree) return 0;
  return r.feeUsdApprox ?? 99;
}

/**
 * GET /api/opportunities
 * Filters:
 *  - destination: "all" | continent | country
 *  - level:       "all" | undergraduate | masters | phd
 *  - field:       "any" | one of FIELDS
 *  - fee:         "all" | "low" (≤ $30 or free) | "free" ($0 confirmed)
 *  - freeOnly:    legacy "1" → same as fee=free
 *  - kind:        "all" | UNIVERSITY | SCHOLARSHIP
 *  - moiOnly:     "1" → only MOI-accepted (English waiver)
 *  - status:      "all" | OPEN | UPCOMING
 *  - q:           free text
 * Returns results (with resolved related links) + university↔scholarship pairs.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const destination = sp.get("destination") ?? "all";
  const level = sp.get("level") ?? "all";
  const field = sp.get("field") ?? "any";
  const kind = sp.get("kind") ?? "all";
  const moiOnly = sp.get("moiOnly") === "1";
  const statusFilter = sp.get("status") ?? "all";
  const q = (sp.get("q") ?? "").trim().toLowerCase();

  // fee filter: legacy freeOnly=1 → free; otherwise explicit param
  let fee = sp.get("fee") ?? "low";
  if (sp.get("freeOnly") === "1") fee = "free";
  if (sp.get("freeOnly") === "0" && !sp.get("fee")) fee = "all";

  const where: Record<string, unknown> = {};
  if (destination !== "all") {
    if (CONTINENTS.includes(destination)) {
      where.continent = destination;
    } else {
      where.country = destination;
    }
  }
  if (kind === "UNIVERSITY" || kind === "SCHOLARSHIP") where.kind = kind;
  if (moiOnly) where.moiAccepted = true;

  const rows: Row[] = await db.opportunity.findMany({ where });

  const now = new Date();
  const stepsOf = (r: Row): number => {
    try {
      return (JSON.parse(r.applicationSteps) as unknown[]).length;
    } catch {
      return 0;
    }
  };

  // decorate with cycle + derived fields
  const decorated = rows.map((r) => {
    const cycle = computeCycle(r, now);
    const usd = feeUsd(r);
    const score =
      (r.moiAccepted ? 3 : 0) +
      (r.feeConfirmedFree ? 2 : 0) +
      (usd > 0 && usd <= 30 ? 1 : 0) +
      (r.fundingType === "FULLY_FUNDED" ? 2 : r.fundingType === "NO_TUITION" ? 1.5 : 0) +
      (cycle.status === "OPEN" ? 1 : cycle.status === "ROLLING" ? 0.5 : 0);
    return { ...r, cycle, feeUsd: usd, stepsCount: stepsOf(r), matchScore: score };
  });

  const passes = (r: (typeof decorated)[number]) => {
    const cycle = r.cycle;
    if (statusFilter === "OPEN" && !["OPEN", "ROLLING"].includes(cycle.status)) return false;
    if (statusFilter === "UPCOMING" && cycle.status !== "UPCOMING") return false;
    if (level !== "all" && !r.levels.split(",").includes(level)) return false;
    if (field !== "any" && field !== "all") {
      const fields = r.fields.split("|").map((f) => f.trim().toLowerCase());
      if (!fields.includes("any") && !fields.includes(field)) return false;
    }
    if (fee === "free" && !r.feeConfirmedFree) return false;
    if (fee === "low" && r.feeUsd > 30) return false;
    if (q) {
      const hay = `${r.name} ${r.provider} ${r.country} ${r.fields.replace(/\|/g, " ")} ${r.requirementsSummary ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const results = decorated.filter(passes);

  // resolve related links from the FULL table (links stay visible even if the partner is filtered out)
  const bySlug = new Map(decorated.map((r) => [r.slug, r]));
  const slim = (r: (typeof decorated)[number]) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    country: r.country,
    countryCode: r.countryCode,
    feeAmount: r.feeAmount,
    feeCurrency: r.feeCurrency,
    feeConfirmedFree: r.feeConfirmedFree,
    feeUsd: r.feeUsd,
    feeNote: r.feeNote,
    fundingType: r.fundingType,
    moiAccepted: r.moiAccepted,
    officialUrl: r.officialUrl,
    cycle: { status: r.cycle.status, label: r.cycle.label },
  });

  const withRelated = results.map((r) => ({
    ...r,
    related: r.relatedSlugs
      ? r.relatedSlugs
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map((s) => bySlug.get(s))
          .filter((x): x is (typeof decorated)[number] => Boolean(x))
          .map(slim)
      : [],
  }));

  // university ↔ scholarship pairs where BOTH sides pass the current filters
  // (full objects on both sides so the UI can reuse the rich card component)
  const pairs = withRelated
    .filter((r) => r.kind === "UNIVERSITY" && r.related.length > 0)
    .flatMap((uni) =>
      uni.relatedSlugs
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => withRelated.find((x) => x.slug === s))
        .filter((x): x is (typeof withRelated)[number] => Boolean(x))
        .map((sch) => ({
          id: `${uni.slug}__${sch.slug}`,
          university: uni,
          scholarship: sch,
          combinedFeeUsd: uni.feeUsd + sch.feeUsd,
          bothFree: uni.feeUsd === 0 && sch.feeUsd === 0,
          bothOpen: ["OPEN", "ROLLING"].includes(uni.cycle.status) && ["OPEN", "ROLLING"].includes(sch.cycle.status),
        }))
    )
    .sort((a, b) => a.combinedFeeUsd - b.combinedFeeUsd)
    .slice(0, 40);

  // Sort: OPEN first (by soonest close), then ROLLING, UPCOMING, then CLOSED; score as tiebreaker
  const order: Record<string, number> = { OPEN: 0, ROLLING: 1, UPCOMING: 2, CLOSED: 3 };
  withRelated.sort((a, b) => {
    const oa = order[a.cycle.status] ?? 4;
    const ob = order[b.cycle.status] ?? 4;
    if (oa !== ob) return oa - ob;
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    const da = a.cycle.nextClose ?? a.cycle.nextOpen ?? "9999";
    const dbb = b.cycle.nextClose ?? b.cycle.nextOpen ?? "9999";
    return da.localeCompare(dbb);
  });

  return NextResponse.json({
    count: withRelated.length,
    results: withRelated,
    pairs,
  });
}
