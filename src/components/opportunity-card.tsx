"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  CalendarClock,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  Landmark,
  Languages,
  Lightbulb,
  ListChecks,
  Quote,
  ShieldAlert,
  Users,
} from "lucide-react";

export interface Cycle {
  status: "OPEN" | "UPCOMING" | "CLOSED" | "ROLLING";
  nextOpen?: string;
  nextClose?: string;
  label: string;
}

export interface Opportunity {
  id: string;
  name: string;
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
  feeNote: string | null;
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
  requirementsSummary: string | null;
  eligibilityNote: string | null;
  officialUrl: string;
  competitiveNote: string | null;
  successTips: string | null;
  applicationSteps: string;
  stepsCount: number;
  cycle: Cycle;
}

export interface Step {
  title: string;
  detail: string;
}

export function flagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  return countryCode
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

const FUNDING_LABEL: Record<string, string> = {
  FULLY_FUNDED: "Fully funded",
  PARTIAL: "Partial funding",
  NO_TUITION: "No tuition fees",
  SELF_FUNDED: "Self-funded",
};

function statusStyles(status: string): string {
  switch (status) {
    case "OPEN":
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    case "ROLLING":
      return "bg-teal-500/15 text-teal-300 border-teal-500/40";
    case "UPCOMING":
      return "bg-amber-500/15 text-amber-300 border-amber-500/40";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
}

export function OpportunityCard({ op, originCountry }: { op: Opportunity; originCountry?: string }) {
  const [open, setOpen] = useState(false);
  const levels = op.levels.split(",");
  const fields = op.fields.split("|").map((f) => f.trim());

  return (
    <Card className="border-slate-800 bg-slate-900/60 backdrop-blur transition-colors hover:border-slate-600">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-300">
                {op.kind === "SCHOLARSHIP" ? (
                  <span className="inline-flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-amber-400" /> Scholarship
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-teal-300" /> University / Program
                  </span>
                )}
              </span>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                {flagEmoji(op.countryCode)} {op.country}
                {op.city ? ` — ${op.city}` : ""}
              </span>
              <span aria-hidden>·</span>
              <span>{op.continent}</span>
            </div>
            <h3 className="mt-1 text-base font-semibold leading-snug text-slate-50 sm:text-lg">{op.name}</h3>
            <p className="mt-0.5 text-xs text-slate-400">{op.provider}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="outline" className={`${statusStyles(op.cycle.status)} border text-[11px] font-semibold`}>
              {op.cycle.status === "ROLLING" ? "ROLLING" : op.cycle.status.replace("_", " ")} — {op.cycle.label}
            </Badge>
            {op.feeConfirmedFree ? (
              <Badge className="border border-emerald-500/50 bg-emerald-500/15 text-[11px] font-semibold text-emerald-300">
                <BadgeCheck className="mr-1 h-3 w-3" /> $0 fee — confirmed free
              </Badge>
            ) : (
              <Badge className="border border-amber-500/40 bg-amber-500/10 text-[11px] text-amber-200">
                Fee: {op.feeAmount > 0 ? `${op.feeCurrency} ${op.feeAmount}` : "may apply"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {levels.map((l) => (
            <Badge key={l} variant="secondary" className="bg-slate-800 text-[11px] capitalize text-slate-300">
              {l}
            </Badge>
          ))}
          {fields.slice(0, 3).map((f) => (
            <Badge key={f} variant="secondary" className="bg-slate-800/70 text-[11px] text-slate-400">
              {f === "any" ? "all fields" : f}
            </Badge>
          ))}
          {fields.length > 3 && (
            <Badge variant="secondary" className="bg-slate-800/70 text-[11px] text-slate-400">
              +{fields.length - 3}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Users className="h-3 w-3" /> Recommendations
            </div>
            <p className="mt-0.5 font-semibold text-slate-200">
              {op.recommendationsRequired
                ? `${op.recommendationsCount ?? "Yes"} required`
                : "Not required"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <FileText className="h-3 w-3" /> Transcripts
            </div>
            <p className={`mt-0.5 font-semibold ${op.unofficialTranscripts ? "text-emerald-300" : "text-slate-200"}`}>
              {op.unofficialTranscripts ? "Unofficial OK" : "Official required"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Languages className="h-3 w-3" /> English test
            </div>
            <p className={`mt-0.5 font-semibold ${op.moiAccepted ? "text-emerald-300" : "text-slate-200"}`}>
              {op.moiAccepted ? `Waivable${originCountry ? ` for ${originCountry}` : ""} (MOI)` : "Usually required"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <Globe2 className="h-3 w-3" /> Local language
            </div>
            <p className={`mt-0.5 font-semibold ${op.localLanguageRequired ? "text-amber-300" : "text-emerald-300"}`}>
              {op.localLanguageRequired ? "Required" : "Not required"}
            </p>
          </div>
        </div>

        {op.fundingNote && (
          <p className="line-clamp-2 text-sm text-slate-300">
            <Landmark className="mr-1.5 inline h-3.5 w-3.5 text-amber-400" />
            <span className="font-medium text-amber-200">{FUNDING_LABEL[op.fundingType] ?? op.fundingType}:</span>{" "}
            {op.fundingNote}
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
              <ListChecks className="mr-1.5 h-4 w-4" /> How to apply ({op.stepsCount} steps)
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto border-slate-700 bg-slate-900 text-slate-100 sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="pr-6 text-xl">
                {flagEmoji(op.countryCode)} {op.name}
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                {op.provider} — {op.country}. {op.cycle.status === "ROLLING" ? "Rolling admissions." : op.cycle.label}
              </DialogDescription>
            </DialogHeader>

            {op.requirementsSummary && (
              <div className="rounded-lg border border-emerald-800/50 bg-emerald-950/40 p-3 text-sm">
                <p className="flex items-start gap-2 font-medium text-emerald-200">
                  <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0" /> {op.requirementsSummary}
                </p>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Step-by-step application guide
              </h4>
              <ol className="space-y-3">
                {(() => {
                  try {
                    return (JSON.parse(op.applicationSteps ?? "[]") as Step[]).map((s, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300">
                            {i + 1}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-100">{s.title}</p>
                            <p className="mt-0.5 text-sm leading-relaxed text-slate-400">{s.detail}</p>
                          </div>
                        </li>
                      )
                    );
                  } catch {
                    return null;
                  }
                })()}
              </ol>
            </div>

            <Separator className="bg-slate-800" />

            <div className="grid gap-3 text-sm">
              <Section title="Application fee" icon={<BadgeCheck className="h-4 w-4" />}>
                {op.feeConfirmedFree
                  ? "Confirmed FREE to apply ($0)."
                  : `Fee: ${op.feeAmount > 0 ? `${op.feeCurrency} ${op.feeAmount}` : "varies"}`}{" "}
                {op.feeNote}
              </Section>
              <Section title="Funding" icon={<Landmark className="h-4 w-4" />}>
                {FUNDING_LABEL[op.fundingType] ?? op.fundingType}. {op.fundingNote}
              </Section>
              <Section title="English & language requirements" icon={<Languages className="h-4 w-4" />}>
                {op.englishTests ?? "No standardized English test specified."}{" "}
                {op.moiAccepted && op.moiNote ? `MOI waiver: ${op.moiNote}` : ""}{" "}
                {op.localLanguageNote ? `Local language: ${op.localLanguageNote}` : ""}
              </Section>
              <Section title="Documents & references" icon={<FileText className="h-4 w-4" />}>
                Recommendations: {op.recommendationsRequired ? `yes — ${op.recommendationsCount ?? "?"}${op.recommendationsNote ? ` (${op.recommendationsNote})` : ""}` : "not required"}.{" "}
                Transcripts: {op.unofficialTranscripts ? "unofficial/scanned accepted" : "official certified required"}
                {op.transcriptsNote ? ` — ${op.transcriptsNote}` : ""}.{" "}
                {op.essayRequired ? `Essay: ${op.essayNote ?? "required"}` : "No long essay required."}
              </Section>
              {op.cycleNote && (
                <Section title="Application window" icon={<CalendarClock className="h-4 w-4" />}>
                  {op.cycleNote}
                </Section>
              )}
              {op.eligibilityNote && (
                <Section title="Eligibility" icon={<Users className="h-4 w-4" />}>
                  {op.eligibilityNote}
                </Section>
              )}
              {op.competitiveNote && (
                <Section title="Competitiveness" icon={<ShieldAlert className="h-4 w-4" />}>
                  {op.competitiveNote}
                </Section>
              )}
              {op.successTips && (
                <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 p-3">
                  <p className="flex items-start gap-2 text-sm text-amber-100">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                    <span>
                      <strong className="text-amber-200">Insider tip:</strong> {op.successTips}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <a
              href={op.officialUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300"
            >
              Open official website <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </DialogContent>
        </Dialog>

        <a href={op.officialUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
            Official site <ChevronRight className="ml-0.5 h-4 w-4" />
          </Button>
        </a>
      </CardFooter>
    </Card>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {icon} {title}
      </p>
      <p className="mt-1 leading-relaxed text-slate-300">{children}</p>
    </div>
  );
}
