"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { OpportunityCard, Opportunity, flagEmoji, statusDotColor } from "@/components/opportunity-card";
import { useCopilot } from "@/lib/copilot-store";
import { CheckCircle2, Handshake, ListTodo, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const { addApplication, apps } = useCopilot();

  useEffect(() => {
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

  const addBoth = () => {
    const a = addApplication(pair.university);
    const b = addApplication(pair.scholarship);
    toast({
      title: a || b ? "Both added to your Co-Pilot 🎒" : "Already on your tracker",
      description: a || b ? "Two submission kits are waiting below with their checklists." : undefined,
    });
  };

  const allTracked = apps.some((a) => a.slug === pair.university.slug) && apps.some((a) => a.slug === pair.scholarship.slug);

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors sm:p-5 ${
        bothDone ? "border-success bg-success/5" : "border-border bg-card"
      }`}
    >
      {/* header strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 ring-1 ring-teal-500/40">
            <Handshake className="h-5 w-5 text-teal-600 dark:text-teal-300" />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Apply to both — the safe combo</p>
            <p className="text-[11px] text-muted-foreground">
              {pair.university.country} · {pair.scholarship.provider}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={`text-[11px] font-semibold ${
              pair.bothFree
                ? "border-success/50 bg-success/15 text-success"
                : "border-primary/40 bg-primary/10 text-primary"
            }`}
          >
            {pair.bothFree ? "$0 — BOTH applications free" : `~$${pair.combinedFeeUsd} total to apply for both`}
          </Badge>
          {pair.bothOpen && (
            <Badge variant="outline" className="border-success/60 bg-success/10 text-[11px] text-success">
              both open right now
            </Badge>
          )}
          {bothDone ? (
            <Badge className="border border-success/60 bg-success/20 text-[11px] font-bold text-success">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Both done!
            </Badge>
          ) : (
            <Badge variant="outline" className="border-border text-[11px]">
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
              done[i] ? "border-success/60 bg-success/10" : "border-border bg-secondary/40 hover:border-primary/40"
            }`}
          >
            <Checkbox checked={done[i]} onCheckedChange={() => toggle(i as 0 | 1)} className="mt-0.5" aria-label={`Mark ${item.label} as done`} />
            <div className="min-w-0">
              <p className={`text-xs font-semibold ${done[i] ? "text-success line-through" : "text-foreground"}`}>{item.label}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {flagEmoji(pair.university.countryCode)} Strategy: file the university admission first, then attach the scholarship (free) application. Both checkmarks are saved on this device.
        </p>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={addBoth} disabled={allTracked}>
          {allTracked ? <Check className="h-3.5 w-3.5 text-success" /> : <Plus className="h-3.5 w-3.5" />}
          {allTracked ? "Both in co-pilot" : "Track both in Co-Pilot"}
        </Button>
      </div>
    </div>
  );
}
