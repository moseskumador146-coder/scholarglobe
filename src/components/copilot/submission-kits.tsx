"use client";

/**
 * Submission Kits — for each application:
 *   • live document checklist (auto-generated from that opportunity's real rules)
 *   • deadline countdown + status stepper (planned → gathering → ready → submitted → decision)
 *   • click-by-click submit guide + official portal link
 *   • paste-ready answers summary + AI motivation-letter draft
 *   • one-tap emails (fee waiver, MOI waiver, follow-up) via the Email chooser
 */

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  DOC_TYPE_ICON,
  STATUS_META,
  useCopilot,
  type AppDecision,
  type AppStatus,
  type CopilotApplication,
} from "@/lib/copilot-store";
import { buildEmail, type EmailDraft } from "@/lib/email-templates";
import { flagEmoji, kindMeta } from "@/components/opportunity-card";
import { EmailSendDialog } from "@/components/copilot/email-send-dialog";
import { CopilotBrowser } from "@/components/copilot/browser/copilot-browser";
import {
  CalendarClock,
  ChevronDown,
  Copy,
  ExternalLink,
  Globe2,
  Loader2,
  Mail,
  Sparkles,
  Trash2,
} from "lucide-react";

const STATUS_ORDER: AppStatus[] = ["planned", "gathering", "ready", "submitted", "decision"];

function daysLeft(iso: string | null): number | null {
  if (!iso) return null;
  const d = Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
  return Number.isFinite(d) ? d : null;
}

export function SubmissionKits() {
  const { apps, updateApplication, removeApplication, profile, docs } = useCopilot();
  const { toast } = useToast();
  const [emailOpen, setEmailOpen] = useState(false);
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [emailTitle, setEmailTitle] = useState<string | undefined>(undefined);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState<string | null>(null);
  const [browserApp, setBrowserApp] = useState<CopilotApplication | null>(null);

  // Kits keep themselves in sync with the vault: a checklist item is done when
  // the user ticked it OR a matching document already exists in the vault.
  const vaultTypes = useMemo(() => new Set(docs.map((d) => d.type)), [docs]);

  // Auto-expand the first kit once applications load (and keep it valid).
  useEffect(() => {
    if (apps.length === 0) {
      if (expanded !== null) setExpanded(null);
      return;
    }
    if (!apps.some((a) => a.slug === expanded)) setExpanded(apps[0].slug);
  }, [apps, expanded]);

  const openEmail = (app: CopilotApplication, kind: Parameters<typeof buildEmail>[0], title: string, note?: string) => {
    setDraft(buildEmail(kind, profile, appToMinimal(app), { note }));
    setEmailTitle(title);
    setEmailOpen(true);
  };

  const aiSop = async (app: CopilotApplication) => {
    setAiBusy(app.slug);
    try {
      const res = await fetch("/api/essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "sop",
          op: { name: app.name, provider: app.provider, country: app.country, kind: app.kind, levels: app.levels, fields: app.fields, fundingNote: app.fundingNote, essayNote: app.essayNote },
          profile: {
            fullName: profile.fullName, nationality: profile.nationality,
            highestDegree: profile.highestDegree, degreeInstitution: profile.degreeInstitution,
            field: profile.field, gpa: profile.gpa, careerGoal: profile.careerGoal,
            achievements: profile.achievements, englishStatus: profile.englishStatus,
          },
        }),
      }).then((r) => r.json());
      if (res.draft) {
        updateApplication(app.slug, { essayDraft: res.draft });
        toast({ title: "Motivation letter drafted ✨", description: "Edit it to sound like you — never submit unedited." });
      } else {
        toast({ title: res.error ?? "AI drafting unavailable right now", variant: "destructive" });
      }
    } catch {
      toast({ title: "AI drafting unavailable right now", variant: "destructive" });
    } finally {
      setAiBusy(null);
    }
  };

  if (apps.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center">
        <p className="text-sm font-semibold text-foreground">No applications being tracked yet</p>
        <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
          Run a search, then press <span className="font-semibold text-foreground">＋ Co-Pilot</span> on any university or
          scholarship card. A submission kit appears here with its real document checklist, deadline and emails.
        </p>
      </div>
    );
  }

  const sorted = [...apps].sort((a, b) => (daysLeft(a.deadlineIso) ?? 999) - (daysLeft(b.deadlineIso) ?? 999));

  return (
    <div className="space-y-3">
      {sorted.map((app) => {
        const autoCovered = app.reqDocs.filter((d) => vaultTypes.has(d.type)).length;
        const done = app.reqDocs.filter((d) => app.checklist[d.type] || vaultTypes.has(d.type)).length;
        const pct = Math.round((done / Math.max(1, app.reqDocs.length)) * 100);
        const dl = daysLeft(app.deadlineIso);
        const isOpen = expanded === app.slug;
        const statusIdx = STATUS_ORDER.indexOf(app.status);
        const allCovered = done >= app.reqDocs.length;
        const suggestReady = allCovered && (app.status === "planned" || app.status === "gathering");

        return (
          <Card key={app.slug} className="overflow-hidden">
            {/* Header row */}
            <button
              type="button"
              className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
              onClick={() => setExpanded(isOpen ? null : app.slug)}
              aria-expanded={isOpen}
            >
              <span className="text-2xl">{kindMeta(app.kind).icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold text-foreground">
                  {flagEmoji(app.countryCode)} {app.name}
                </span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {app.provider} · {app.country} · fee {app.feeLabel}
                </span>
              </span>
              <span className="flex shrink-0 flex-wrap items-center gap-2">
                {autoCovered > 0 && (
                  <Badge variant="outline" className="border-success/50 text-[10px] font-semibold text-success">
                    📁 {autoCovered} doc{autoCovered === 1 ? "" : "s"} in vault
                  </Badge>
                )}
                {dl !== null && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-semibold ${dl <= 21 ? "border-destructive/50 text-destructive" : "border-warning/50 text-warning"}`}
                  >
                    <CalendarClock className="mr-1 h-3 w-3" />
                    {dl > 0 ? `${dl} day${dl === 1 ? "" : "s"} left` : "check new cycle"}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] font-bold" style={{ borderColor: STATUS_META[app.status].color, color: STATUS_META[app.status].color }}>
                  {STATUS_META[app.status].icon} {STATUS_META[app.status].label}
                </Badge>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </span>
            </button>

            {isOpen && (
              <CardContent className="space-y-4 border-t border-border p-4 sm:p-5">
                {/* status stepper */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {STATUS_ORDER.map((s, i) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() =>
                        updateApplication(app.slug, {
                          status: s,
                          ...(s === "submitted" ? { submittedAt: new Date().toISOString() } : {}),
                        })
                      }
                      className={`rounded-full px-3 py-1 text-[10px] font-bold transition ${
                        i <= statusIdx ? "text-white" : "bg-secondary text-muted-foreground hover:bg-accent"
                      }`}
                      style={i <= statusIdx ? { background: STATUS_META[s].color } : undefined}
                      aria-label={`Set status ${STATUS_META[s].label}`}
                    >
                      {STATUS_META[s].icon} {STATUS_META[s].label}
                    </button>
                  ))}
                  {app.status === "decision" && (
                    <select
                      className="rounded-full border border-border bg-card px-2 py-1 text-[10px] font-semibold text-foreground"
                      value={app.decision}
                      onChange={(e) => updateApplication(app.slug, { decision: e.target.value as AppDecision })}
                      aria-label="Decision outcome"
                    >
                      <option value="none">pending…</option>
                      <option value="accepted">accepted 🎉</option>
                      <option value="waitlist">waitlist</option>
                      <option value="rejected">rejected</option>
                    </select>
                  )}
                </div>

                {/* doc checklist + progress */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-bold text-foreground">Document checklist — tick what you have ready</p>
                    <span className="text-[10px] font-semibold text-muted-foreground">{done}/{app.reqDocs.length}</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <div className="mt-2.5 grid gap-1.5 sm:grid-cols-2">
                    {app.reqDocs.map((r) => (
                      <label
                        key={r.type}
                        className={`flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 transition ${
                          app.checklist[r.type] || vaultTypes.has(r.type) ? "border-success/50 bg-success/10" : "border-border bg-secondary/30 hover:border-primary/40"
                        }`}
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={!!app.checklist[r.type] || vaultTypes.has(r.type)}
                          disabled={vaultTypes.has(r.type)}
                          onCheckedChange={(v) => updateApplication(app.slug, { checklist: { ...app.checklist, [r.type]: !!v } })}
                          aria-label={`Mark ${r.label} ready`}
                        />
                        <span className="min-w-0">
                          <span className="block text-[11px] font-semibold text-foreground">
                            {DOC_TYPE_ICON[r.type]} {r.label}
                            {vaultTypes.has(r.type) && <span className="ml-1 font-normal text-success">· in vault ✓</span>}
                          </span>
                          <span className="block text-[10px] leading-snug text-muted-foreground">{r.note}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  {allCovered ? (
                    <p className="mt-2 text-[10px] font-semibold text-success">
                      All {app.reqDocs.length} documents ready — this kit is complete. 🎉
                    </p>
                  ) : (
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Missing {app.reqDocs.length - done} — upload files in the <span className="font-semibold text-foreground">Documents</span> tab and the checklist ticks itself automatically.
                    </p>
                  )}
                  {suggestReady && (
                    <Button
                      size="sm"
                      className="mt-2 gap-1.5 bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => {
                        updateApplication(app.slug, { status: "ready" });
                        toast({ title: "Marked Ready to submit 🚀", description: "Open the official portal, paste your answers and submit." });
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Documents complete — mark Ready to submit
                    </Button>
                  )}
                </div>

                {/* actions */}
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" className="gap-1.5 font-semibold" onClick={() => setBrowserApp(app)}>
                    <Globe2 className="h-3.5 w-3.5" /> Open portal in Co-Pilot Browser
                  </Button>
                  <a href={app.officialUrl} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="gap-1 px-2 text-muted-foreground" aria-label="Open in a real browser tab">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                  {app.moiAccepted && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEmail(app, "moiWaiver", "Email: English-test waiver (MOI)")}>
                      <Mail className="h-3.5 w-3.5" /> MOI waiver email
                    </Button>
                  )}
                  {app.feeLabel !== "$0" && Number(app.feeLabel.replace(/[^0-9.]/g, "")) > 0 && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEmail(app, "feeWaiver", "Email: application fee waiver")}>
                      <Mail className="h-3.5 w-3.5" /> Fee waiver email
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEmail(app, "missingDoc", "Email: document question")}>
                    <Mail className="h-3.5 w-3.5" /> Ask a document question
                  </Button>
                  {app.status === "submitted" && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEmail(app, "statusFollowup", "Email: status follow-up")}>
                      <Mail className="h-3.5 w-3.5" /> Follow up
                    </Button>
                  )}
                </div>

                {/* AI motivation letter */}
                {(app.essayDraft || app.essayNote || app.kind === "SCHOLARSHIP") && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Motivation letter / essay
                      </p>
                      <div className="flex gap-1.5">
                        {!app.essayDraft && (
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={() => aiSop(app)} disabled={aiBusy === app.slug}>
                            {aiBusy === app.slug ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI draft
                          </Button>
                        )}
                        {app.essayDraft && (
                          <Button
                            size="sm" variant="ghost" className="h-7 gap-1 text-[11px]"
                            onClick={async () => { try { await navigator.clipboard.writeText(app.essayDraft); toast({ title: "Letter copied" }); } catch { /* noop */ } }}
                          >
                            <Copy className="h-3 w-3" /> Copy
                          </Button>
                        )}
                      </div>
                    </div>
                    {app.essayDraft ? (
                      <Textarea
                        value={app.essayDraft}
                        onChange={(e) => updateApplication(app.slug, { essayDraft: e.target.value })}
                        className="mt-2 min-h-[180px] bg-card text-xs leading-relaxed"
                        aria-label="Motivation letter draft"
                      />
                    ) : (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {app.essayNote || "Generate a first draft tailored to this programme — then make it yours."}
                      </p>
                    )}
                  </div>
                )}

                {/* notes + answers quick copy */}
                <div className="grid gap-3 lg:grid-cols-2">
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-foreground">My notes</p>
                    <Textarea
                      value={app.notes}
                      onChange={(e) => updateApplication(app.slug, { notes: e.target.value })}
                      placeholder="Portal ID, referee confirmed, payment receipt #, next step…"
                      className="min-h-[72px] text-xs"
                      aria-label="Application notes"
                    />
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-foreground">Paste-ready answers</p>
                    <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                      {Object.entries(app.answers).filter(([, v]) => v.trim()).length === 0 ? (
                        <p className="text-[11px] text-muted-foreground">No answers yet — use the Wizard tab.</p>
                      ) : (
                        Object.entries(app.answers)
                          .filter(([, v]) => v.trim())
                          .map(([k, v]) => (
                            <button
                              key={k}
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg border border-border bg-secondary/30 px-2.5 py-1.5 text-left"
                              onClick={async () => { try { await navigator.clipboard.writeText(v); toast({ title: "Answer copied" }); } catch { /* noop */ } }}
                            >
                              <Copy className="h-3 w-3 shrink-0 text-muted-foreground" />
                              <span className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground">{v}</span>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                {/* how the 50-50 split works */}
                <p className="rounded-lg bg-secondary/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">How we apply together:</span> the co-pilot prepares the checklist, answers,
                  emails and this guide — you review everything and click the final submit on the official portal. That final click must
                  legally be yours, and it keeps your application (and any future offer) 100% safe.
                </p>

                <div className="flex justify-end">
                  <Button
                    size="sm" variant="ghost" className="gap-1 text-destructive hover:text-destructive"
                    onClick={() => { removeApplication(app.slug); toast({ title: "Application removed from tracker" }); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove from tracker
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      <EmailSendDialog open={emailOpen} onOpenChange={setEmailOpen} draft={draft} title={emailTitle} />
      <CopilotBrowser
        open={!!browserApp}
        onOpenChange={(o) => {
          if (!o) setBrowserApp(null);
        }}
        initialUrl={browserApp?.officialUrl}
        appName={browserApp?.name}
        appSlug={browserApp?.slug}
      />
    </div>
  );
}

function appToMinimal(app: CopilotApplication) {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    kind: app.kind,
    provider: app.provider,
    country: app.country,
    countryCode: app.countryCode,
    officialUrl: app.officialUrl,
    feeConfirmedFree: app.feeLabel === "$0",
    feeAmount: 0,
    feeCurrency: "USD",
    feeUsd: 0,
    recommendationsRequired: false,
    recommendationsCount: null,
    recommendationsNote: null,
    unofficialTranscripts: false,
    transcriptsNote: null,
    essayRequired: false,
    essayNote: null,
    moiAccepted: app.moiAccepted,
    moiNote: null,
    englishTests: null,
    localLanguageRequired: false,
    localLanguageNote: null,
    cycle: { status: "OPEN", nextOpen: undefined, nextClose: app.deadlineIso ?? undefined, label: app.deadlineNote },
  };
}
