import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeCycle } from "@/lib/opportunity-status";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.opportunity.findMany({
    select: { kind: true, feeConfirmedFree: true, feeUsdApprox: true, moiAccepted: true, relatedSlugs: true, rolling: true, opensMonth: true, closesMonth: true, opensDay: true, closesDay: true },
  });
  const now = new Date();

  let universities = 0;
  let lowFeeUnis = 0;
  let freeUnis = 0;
  let scholarships = 0;
  let free = 0;
  let moi = 0;
  let linked = 0;
  let openNow = 0;

  for (const r of rows) {
    const isUni = r.kind === "UNIVERSITY";
    if (isUni) universities++;
    else scholarships++;
    if (r.feeConfirmedFree) free++;
    if (r.moiAccepted) moi++;
    if (r.relatedSlugs) linked++;
    if (isUni && r.feeConfirmedFree) freeUnis++;
    if (isUni && (r.feeConfirmedFree || (r.feeUsdApprox ?? 99) <= 30)) lowFeeUnis++;
    const st = computeCycle(r, now).status;
    if (st === "OPEN" || st === "ROLLING") openNow++;
  }

  return NextResponse.json({
    total: rows.length,
    free,
    moi,
    universities,
    scholarships,
    freeUnis,
    lowFeeUnis,
    linked,
    openNow,
  });
}
