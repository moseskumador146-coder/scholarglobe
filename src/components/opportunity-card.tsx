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
import { useToast } from "@/hooks/use-toast";
import { useCopilot } from "@/lib/copilot-store";
import {
  Award,
  BadgeCheck,
  BookOpenCheck,
  CalendarClock,
  Check,
  ChevronRight,
  ExternalLink,
  FileText,
  Globe2,
  GraduationCap,
  Handshake,
  Landmark,
  Languages,
  Lightbulb,
  ListChecks,
  Plus,
  ShieldAlert,
  Users,
} from "lucide-react";

export interface Cycle {
  status: "OPEN" | "UPCOMING" | "CLOSED" | "ROLLING";
  nextOpen?: string;
  nextClose?: string;
  label: string;
}

export interface RelatedOpportunity {
  id: string;
  slug: string;
  name: string;
  kind: string;
  country: string;
  countryCode: string;
  feeAmount: number;
  feeCurrency: string;
  feeConfirmedFree: boolean;
  feeUsd: number;
  feeNote: string | null;
  fundingType: string;
  moiAccepted: boolean;
  officialUrl: string;
  cycle: { status: "OPEN" | "UPCOMING" | "CLOSED" | "ROLLING"; label: string };
}

export interface Opportunity {
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
  feeUsd: number;
  feeNote: string | null;
  related: RelatedOpportunity[];
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
  matchScore: number;
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
      return "bg-success/15 text-success border-success/40";
    case "ROLLING":
      return "bg-primary/15 text-primary border-primary/40";
    case "UPCOMING":
      return "bg-warning/15 text-warning border-warning/40";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function statusDotColor(status: string): string {
  switch (status) {
    case "OPEN":
      return "bg-success";
    case "ROLLING":
      return "bg-primary";
    case "UPCOMING":
      return "bg-warning";
    default:
      return "bg-muted-foreground";
  }
}

export function OpportunityCard({ op, originCountry }: { op: Opportunity; originCountry?: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { addApplication, apps } = useCopilot();
  const tracked = apps.some((a) => a.slug === op.slug);
  const levels = op.levels.split(",");
  const fields = op.fields.split("|").map((f) => f.trim());

  const addToCopilot = () => {
    const ok = addApplication(op);
    if (ok) {
      toast({
        title: "Added to your Apply Co-Pilot 🎒",
        description: `${op.name} — find its submission kit in the co-pilot section below.`,
      });
    } else {
      toast({ title: "Already in your co-pilot", description: `${op.name} is on your tracker.` });
    }
  };

  return (
    <Card className="lift border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {op.kind === "SCHOLARSHIP" ? (
                  <span className="inline-flex items-center gap-1">
                    <Award className="h-3.5 w-3.5 text-warning" /> Scholarship
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" /> University / Program
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
            <h3 className="mt-1 text-base font-bold leading-snug text-foreground sm:text-lg">{op.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{op.provider}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge variant="outline" className={`${statusStyles(op.cycle.status)} border text-[11px] font-semibold`}>
              {op.cycle.status === "ROLLING" ? "ROLLING" : op.cycle.status.replace("_", " ")} — {op.cycle.label}
            </Badge>
            {op.feeConfirmedFree ? (
              <Badge className="border border-success/50 bg-success/15 text-[11px] font-semibold text-success">
                <BadgeCheck className="mr-1 h-3 w-3" /> $0 fee — confirmed free
              </Badge>
            ) : op.feeUsd > 0 && op.feeUsd <= 30 ? (
              <Badge className="border border-primary/50 bg-primary/10 text-[11px] font-semibold text-primary">
                Under $30 — {op.feeCurrency} {op.feeAmount} (~${op.feeUsd})
              </Badge>
            ) : (
              <Badge className="border border-warning/40 bg-warning/10 text-[11px] text-warning">
                Fee: {op.feeAmount > 0 ? `${op.feeCurrency} ${op.feeAmount}` : "may apply"}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-3">
        <div className="flex flex-wrap gap-1.5">
          {levels.map((l) => (
            <Badge key={l} variant="secondary" className="text-[11px] capitalize">
              {l}
            </Badge>
          ))}
          {fields.slice(0, 3).map((f) => (
            <Badge key={f} variant="secondary" className="text-[11px] text-muted-foreground">
              {f === "any" ? "all fields" : f}
            </Badge>
          ))}
          {fields.length > 3 && (
            <Badge variant="secondary" className="text-[11px] text-muted-foreground">
              +{fields.length - 3}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-secondary/50 p-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Users className="h-3 w-3" /> Recommendations
            </div>
            <p className="mt-0.5 font-semibold text-foreground">
              {op.recommendationsRequired
                ? `${op.recommendationsCount ?? "Yes"} required`
                : "Not required"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <FileText className="h-3 w-3" /> Transcripts
            </div>
            <p className={`mt-0.5 font-semibold ${op.unofficialTranscripts ? "text-success" : "text-foreground"}`}>
              {op.unofficialTranscripts ? "Unofficial OK" : "Official required"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Languages className="h-3 w-3" /> English test
            </div>
            <p className={`mt-0.5 font-semibold ${op.moiAccepted ? "text-success" : "text-foreground"}`}>
              {op.moiAccepted ? `Waivable${originCountry ? ` for ${originCountry}` : ""} (MOI)` : "Usually required"}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-secondary/50 p-2">
            <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
              <Globe2 className="h-3 w-3" /> Local language
            </div>
            <p className={`mt-0.5 font-semibold ${op.localLanguageRequired ? "text-warning" : "text-success"}`}>
              {op.localLanguageRequired ? "Required" : "Not required"}
            </p>
          </div>
        </div>

        {op.fundingNote && (
          <p className="line-clamp-2 text-sm text-foreground/90">
            <Landmark className="mr-1.5 inline h-3.5 w-3.5 text-warning" />
            <span className="font-semibold text-warning">{FUNDING_LABEL[op.fundingType] ?? op.fundingType}:</span>{" "}
            {op.fundingNote}
          </p>
        )}

        {op.related.length > 0 && (
          <div>
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Handshake className="h-3 w-3" />
              {op.kind === "UNIVERSITY" ? "Fund it with — linked scholarships" : "Apply at — linked universities"}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {op.related.map((r) => (
                <a
                  key={r.slug}
                  href={r.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`${r.name} — ${r.country} — ${r.feeConfirmedFree ? "$0 application" : `${r.feeCurrency} ${r.feeAmount}`} — ${r.cycle.status}: ${r.cycle.label}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[11px] text-foreground/90 transition hover:border-primary hover:text-primary"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(r.cycle.status)}`} />
                  {flagEmoji(r.countryCode)} {r.name}
                  <span className="font-semibold text-muted-foreground">
                    {r.feeConfirmedFree ? "$0" : r.feeUsd > 0 && r.feeUsd <= 30 ? `~$${r.feeUsd}` : "fee"}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white hover:from-indigo-500 hover:to-violet-500 dark:from-indigo-500 dark:to-violet-500 dark:hover:from-indigo-400 dark:hover:to-violet-400">
              <ListChecks className="h-4 w-4" /> How to apply ({op.stepsCount} steps)
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="pr-6 text-xl">
                {flagEmoji(op.countryCode)} {op.name}
              </DialogTitle>
              <DialogDescription>
                {op.provider} — {op.country}. {op.cycle.status === "ROLLING" ? "Rolling admissions." : op.cycle.label}
              </DialogDescription>
            </DialogHeader>

            {op.requirementsSummary && (
              <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
                <p className="flex items-start gap-2 font-medium text-success">
                  <BookOpenCheck className="mt-0.5 h-4 w-4 shrink-0" /> {op.requirementsSummary}
                </p>
              </div>
            )}

            <div>
              <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Step-by-step application guide
              </h4>
              <ol className="space-y-3">
                {(() => {
                  try {
                    return (JSON.parse(op.applicationSteps ?? "[]") as Step[]).map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                          {i + 1}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{s.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{s.detail}</p>
                        </div>
                      </li>
                    ));
                  } catch {
                    return null;
                  }
                })()}
              </ol>
            </div>

            <Separator />

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
              {op.related.length > 0 && (
                <Section
                  title={op.kind === "UNIVERSITY" ? "Fund it with (linked scholarships)" : "Apply at (linked universities)"}
                  icon={<Handshake className="h-4 w-4" />}
                >
                  <ul className="mt-1 space-y-1.5">
                    {op.related.map((r) => (
                      <li key={r.slug} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${statusDotColor(r.cycle.status)}`} />
                        <span className="font-semibold text-foreground">{r.name}</span>
                        <span className="text-muted-foreground">
                          {flagEmoji(r.countryCode)} {r.country} · {r.feeConfirmedFree ? "$0 application" : `${r.feeCurrency} ${r.feeAmount}`} · {r.cycle.status}
                        </span>
                        <a href={r.officialUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                          official page ↗
                        </a>
                      </li>
                    ))}
                  </ul>
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
                <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                  <p className="flex items-start gap-2 text-sm">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                    <span>
                      <strong className="text-warning">Insider tip:</strong>{" "}
                      <span className="text-foreground/90">{op.successTips}</span>
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <a
                href={op.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              >
                Open official website <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button size="sm" variant="outline" onClick={addToCopilot} className="gap-1.5" disabled={tracked}>
                {tracked ? <Check className="h-4 w-4 text-success" /> : <Plus className="h-4 w-4" />}
                {tracked ? "In your co-pilot" : "Add to Co-Pilot"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button size="sm" variant="outline" className="gap-1" onClick={addToCopilot} disabled={tracked}>
          {tracked ? <Check className="h-4 w-4 text-success" /> : <Plus className="h-4 w-4" />}
          {tracked ? "In co-pilot" : "Co-Pilot"}
        </Button>

        <a href={op.officialUrl} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost" className="gap-0.5 text-muted-foreground hover:text-foreground">
            Official site <ChevronRight className="h-4 w-4" />
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
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {icon} {title}
      </p>
      <p className="mt-1 leading-relaxed text-foreground/85">{children}</p>
    </div>
  );
}
