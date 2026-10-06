"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { OpportunityCard, Opportunity, flagEmoji, statusDotColor } from "@/components/opportunity-card";
import { CheckCircle2, Handshake, ListTodo } from "lucide-react";

export interface Pair {
  id: string;
  university: Opportunity;
  scholarship: Opportunity;
  combinedFeeUsd: number;
  bothFree: boolean;
  bothOpen: boolean;
}

function feeLabel(op: Opportunity): string {
  if (op.feeConfirmedFree) return "$0";
  if (op.feeUsd > 0 && op.feeUsd <= 30) return `${op.feeCurrency} ${op.feeAmount} (~$${op.feeUsd})`;
  return op.feeAmount > 0 ? `${op.feeCurrency} ${op.feeAmount}` : "fee applies";
}

/**
 * A university + scholarship application pair.
 * Students tick both checklists (persisted in localStorage) to confirm
 * they have completed BOTH applications.
 */
export function PairCard({ pair, originCountry }: { pair: Pair; originCountry: string }) {
  const [done, setDone] = useState<[boolean, boolean]>([false, false]);

  useEffect(() => {
    // load saved checklist state asynchronously (after paint) to avoid hydration mismatch
    const id = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(`sg-pair-${pair.id}`);
        if (raw) setDone(JSON.parse(raw));
      } catch {
        /* localStorage unavailable — fine */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [pair.id]);

  const toggle = (i: 0 | 1) => {
    setDone((d) => {
      const next: [boolean, boolean] = [d[0], d[1]];
      next[i] = !next[i];
      try {
        localStorage.setItem(`sg-pair-${pair.id}`, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const bothDone = done[0] && done[1];
  const doneCount = Number(done[0]) + Number(done[1]);

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
        bothDone ? "border-emerald-600 bg-emerald-950/20" : "border-slate-800 bg-slate-900/40"
      }`}
    >
      {/* header strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500/15 ring-1 ring-teal-500/40">
            <Handshake className="h-4.5 w-4.5 text-teal-300" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-100">Apply to both — the safe combo</p>
            <p className="text-[11px] text-slate-500">
              {pair.university.country} · {pair.scholarship.provider}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`border text-[11px] font-semibold ${
              pair.bothFree
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                : "border-teal-500/40 bg-teal-500/10 text-teal-200"
            }`}
          >
            {pair.bothFree ? "$0 — BOTH applications free" : `~$${pair.combinedFeeUsd} total to apply for both`}
          </Badge>
          {pair.bothOpen && (
            <Badge variant="outline" className="border-emerald-600/60 bg-emerald-950/40 text-[11px] text-emerald-300">
              both open right now
            </Badge>
          )}
          {bothDone ? (
            <Badge className="border border-emerald-400/60 bg-emerald-500/20 text-[11px] font-bold text-emerald-200">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Both done!
            </Badge>
          ) : (
            <Badge variant="outline" className="border-slate-700 text-[11px] text-slate-400">
              <ListTodo className="mr-1 h-3.5 w-3.5" /> {doneCount}/2 done
            </Badge>
          )}
        </div>
      </div>

      {/* checklist */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2">
        {(
          [
            { label: `University application — ${pair.university.name}`, fee: feeLabel(pair.university), op: pair.university },
            { label: `Scholarship application — ${pair.scholarship.name}`, fee: feeLabel(pair.scholarship), op: pair.scholarship },
          ] as const
        ).map((item, i) => (
          <label
            key={i}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 transition ${
              done[i] ? "border-emerald-600/60 bg-emerald-950/30" : "border-slate-800 bg-slate-950/60 hover:border-slate-600"
            }`}
          >
            <Checkbox checked={done[i]} onCheckedChange={() => toggle(i as 0 | 1)} className="mt-0.5" aria-label={`Mark ${item.label} as done`} />
            <div className="min-w-0">
              <p className={`text-xs font-medium ${done[i] ? "text-emerald-200 line-through" : "text-slate-200"}`}>{item.label}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(item.op.cycle.status)}`} />
                {item.op.cycle.status === "ROLLING" ? "Rolling" : item.op.cycle.status} — {item.op.cycle.label} · fee {item.fee}
              </p>
            </div>
          </label>
        ))}
      </div>

      {/* the two cards side by side */}
      <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
        <OpportunityCard op={pair.university} originCountry={originCountry} />
        <OpportunityCard op={pair.scholarship} originCountry={originCountry} />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
        {flagEmoji(pair.university.countryCode)} Strategy: the university admission is usually the prerequisite — file it first, then attach the scholarship (free) application. Both checkmarks are saved on this device.
      </p>
    </div>
  );
}
