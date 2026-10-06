import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [total, free, moi, universities, scholarships] = await Promise.all([
    db.opportunity.count(),
    db.opportunity.count({ where: { feeConfirmedFree: true } }),
    db.opportunity.count({ where: { moiAccepted: true } }),
    db.opportunity.count({ where: { kind: "UNIVERSITY" } }),
    db.opportunity.count({ where: { kind: "SCHOLARSHIP" } }),
  ]);
  return NextResponse.json({ total, free, moi, universities, scholarships });
}
