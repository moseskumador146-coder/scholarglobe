"use client";

/**
 * Application Wizard — interviews you once (My Profile), then generates
 * paste-ready answers per application, with AI drafting support.
 */

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  useCopilot,
  type CopilotProfile,
  type Referee,
} from "@/lib/copilot-store";
import { Copy, Loader2, Plus, Sparkles, Trash2, UserRound, Wand2 } from "lucide-react";

const FIELDS: { key: keyof CopilotProfile; label: string; ph: string; wide?: boolean }[] = [
  { key: "fullName", label: "Full name (as in passport)", ph: "Ama Kofi Mensah" },
  { key: "email", label: "Email", ph: "you@example.com" },
  { key: "phone", label: "Phone / WhatsApp", ph: "+233 20 123 4567" },
  { key: "nationality", label: "Nationality", ph: "Ghana" },
  { key: "dob", label: "Date of birth", ph: "2000-06-15" },
  { key: "address", label: "City & country of residence", ph: "Accra, Ghana" },
  { key: "highestDegree", label: "Highest degree", ph: "BSc Computer Science" },
  { key: "degreeInstitution", label: "Institution", ph: "Kwame Nkrumah University" },
  { key: "degreeCountry", label: "Institution country", ph: "Ghana" },
  { key: "graduationYear", label: "Graduation year", ph: "2024" },
  { key: "gpa", label: "GPA / class of degree", ph: "First Class · 3.8/4.0" },
  { key: "field", label: "Field of study", ph: "Computer Science" },
];

const EMPTY_REF: Referee = { name: "", title: "", institution: "", email: "", relation: "" };

export function ApplicationWizard() {
  const { profile, setProfile, apps, updateApplication, profileCompletion } = useCopilot();
  const { toast } = useToast();
  const [activeSlug, setActiveSlug] = useState<string>("");
  const [referee, setReferee] = useState<Referee>(EMPTY_REF);
  const [aiBusy, setAiBusy] = useState(false);

  const app = useMemo(() => apps.find((a) => a.slug === activeSlug) ?? null, [apps, activeSlug]);

  // Apps load after mount (browser-local store) — keep a valid selection as the
  // list changes so the answers panel is never stuck on an empty slug.
  useEffect(() => {
    if (apps.length === 0) {
      if (activeSlug !== "") setActiveSlug("");
      return;
    }
    if (!apps.some((a) => a.slug === activeSlug)) setActiveSlug(apps[0].slug);
  }, [apps, activeSlug]);

  const setAnswer = (key: string, val: string) => {
    if (!app) return;
    updateApplication(app.slug, { answers: { ...app.answers, [key]: val } });
  };

  const prefillFromProfile = () => {
    if (!app) return;
    const next: Record<string, string> = { ...app.answers };
    for (const q of app.wizardQs) {
      if (q.fromProfile && profile[q.fromProfile]) next[q.key] = String(profile[q.fromProfile]);
    }
    updateApplication(app.slug, { answers: next });
    toast({ title: "Answers pre-filled from your profile", description: "Review and personalise the long ones." });
  };

  const aiDraft = async () => {
    if (!app) return;
    setAiBusy(true);
    try {
      const res = await fetch("/api/essay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "answers",
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
        const blocks: Record<string, string> = {};
        const labels = ["WHY_PROGRAMME", "STRENGTHS", "CAREER_PLAN", "FINANCIAL_NOTE"];
        let current: string | null = null;
        for (const line of String(res.draft).split("\n")) {
          const found = labels.find((l) => line.trim().startsWith(l + ":") || line.trim() === l);
          if (found) { current = found; blocks[found] = (blocks[found] ?? "") + line.replace(new RegExp(`^\\s*${found}:?\\s*`), "") + "\n"; continue; }
          if (current) blocks[current] += line + "\n";
        }
        const next = { ...app.answers };
        if (blocks.WHY_PROGRAMME?.trim()) next.whyThis = blocks.WHY_PROGRAMME.trim();
        if (blocks.STRENGTHS?.trim()) {
          next.whyThis = next.whyThis?.trim()
            ? `${next.whyThis.trim()}\n\n${blocks.STRENGTHS.trim()}`
            : blocks.STRENGTHS.trim();
        }
        if (blocks.CAREER_PLAN?.trim()) next.careerGoal = blocks.CAREER_PLAN.trim();
        if (blocks.FINANCIAL_NOTE?.trim()) next.financialNeed = blocks.FINANCIAL_NOTE.trim();
        updateApplication(app.slug, { answers: next });
        toast({
          title: "AI draft added",
          description: `Drafted ${Object.keys(blocks).length} answer block${Object.keys(blocks).length === 1 ? "" : "s"} — edit them to sound like you.`,
        });
      } else {
        toast({ title: res.error ?? "AI drafting unavailable right now", variant: "destructive" });
      }
    } catch {
      toast({ title: "AI drafting unavailable right now", description: "You can still write answers manually.", variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const copyAnswer = async (text: string) => {
    try { await navigator.clipboard.writeText(text); toast({ title: "Answer copied — paste it into the portal." }); } catch { /* noop */ }
  };

  const filled = app ? app.wizardQs.filter((q) => (app.answers[q.key] ?? "").trim().length > 0).length : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
      {/* ── My profile ── */}
      <Card className="self-start">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <UserRound className="h-4 w-4 text-primary" /> My profile — answer once, reuse everywhere
            </p>
            <div className="mt-2 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 transition-all" style={{ width: `${profileCompletion}%` }} />
              </div>
              <Badge variant="outline" className="text-[10px]">{profileCompletion}%</Badge>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">Stored only in this browser. The more you fill, the smarter the co-pilot&apos;s drafts.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`pf-${f.key}`} className="text-[11px] text-muted-foreground">{f.label}</Label>
                <Input
                  id={`pf-${f.key}`}
                  value={String(profile[f.key] ?? "")}
                  onChange={(e) => setProfile({ [f.key]: e.target.value } as Partial<CopilotProfile>)}
                  placeholder={f.ph}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-goal" className="text-[11px] text-muted-foreground">Career goal (1-2 sentences)</Label>
            <Textarea
              id="pf-goal"
              value={profile.careerGoal}
              onChange={(e) => setProfile({ careerGoal: e.target.value })}
              placeholder="e.g. Build water-infrastructure data systems for West African cities, then lead policy at the national level…"
              className="min-h-[64px] text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pf-ach" className="text-[11px] text-muted-foreground">Achievements to highlight</Label>
            <Textarea
              id="pf-ach"
              value={profile.achievements}
              onChange={(e) => setProfile({ achievements: e.target.value })}
              placeholder="Awards, projects, publications, leadership, volunteering…"
              className="min-h-[56px] text-sm"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">English status</Label>
              <Select value={profile.englishStatus} onValueChange={(v) => setProfile({ englishStatus: v as CopilotProfile["englishStatus"] })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="moi">Studied in English (MOI waiver)</SelectItem>
                  <SelectItem value="test">Have IELTS/TOEFL score</SelectItem>
                  <SelectItem value="planned">Test booked / planned</SelectItem>
                  <SelectItem value="none">No test yet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="pf-eng" className="text-[11px] text-muted-foreground">English details</Label>
              <Input id="pf-eng" value={profile.englishTestDetails} onChange={(e) => setProfile({ englishTestDetails: e.target.value })} placeholder="IELTS 7.0 / WAEC English C6 / school name…" className="h-9" />
            </div>
          </div>

          <Separator />

          {/* Referees */}
          <div>
            <p className="text-sm font-bold text-foreground">My referees</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Used by the Email Autopilot to request recommendation letters.</p>
            <div className="mt-2 space-y-2">
              {profile.referees.map((r, i) => (
                <div key={i} className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{r.name} · {r.title}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{r.institution} · {r.email} · {r.relation}</p>
                  </div>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    aria-label="Remove referee"
                    onClick={() => setProfile({ referees: profile.referees.filter((_, j) => j !== i) })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <Input placeholder="Referee name" value={referee.name} onChange={(e) => setReferee({ ...referee, name: e.target.value })} className="h-8 text-xs" />
              <Input placeholder="Title (Dr./Prof./Mr.)" value={referee.title} onChange={(e) => setReferee({ ...referee, title: e.target.value })} className="h-8 text-xs" />
              <Input placeholder="Institution" value={referee.institution} onChange={(e) => setReferee({ ...referee, institution: e.target.value })} className="h-8 text-xs" />
              <Input placeholder="Email" value={referee.email} onChange={(e) => setReferee({ ...referee, email: e.target.value })} className="h-8 text-xs" />
              <Input placeholder="Relationship (lecturer for…)" value={referee.relation} onChange={(e) => setReferee({ ...referee, relation: e.target.value })} className="h-8 text-xs sm:col-span-2" />
            </div>
            <Button
              size="sm" variant="outline" className="mt-2 gap-1.5"
              disabled={!referee.name || !referee.email}
              onClick={() => { setProfile({ referees: [...profile.referees, referee] }); setReferee(EMPTY_REF); }}
            >
              <Plus className="h-3.5 w-3.5" /> Add referee
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Per-application answers ── */}
      <Card className="self-start">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Wand2 className="h-4 w-4 text-fuchsia-500 dark:text-fuchsia-300" /> Portal answers — paste-ready
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              The co-pilot interviews you per application so every answer is ready to paste into the official form.
            </p>
          </div>

          {apps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No applications yet — add one from any search result with the <span className="font-semibold text-foreground">＋ Co-Pilot</span> button, then come back.
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Working on</Label>
                <Select value={activeSlug} onValueChange={setActiveSlug}>
                  <SelectTrigger aria-label="Select application"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {apps.map((a) => (
                      <SelectItem key={a.slug} value={a.slug}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {app && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px]">
                      {filled}/{app.wizardQs.length} answered
                    </Badge>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={prefillFromProfile} className="gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" /> Pre-fill from profile
                      </Button>
                      <Button size="sm" onClick={aiDraft} disabled={aiBusy} className="gap-1.5">
                        {aiBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        AI draft
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {app.wizardQs.map((q) => (
                      <div key={q.key} className="rounded-xl border border-border bg-secondary/30 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground">{q.question}</p>
                          {(app.answers[q.key] ?? "").trim() && (
                            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" aria-label="Copy answer" onClick={() => copyAnswer(app.answers[q.key])}>
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{q.hint}</p>
                        {q.multiline ? (
                          <Textarea
                            value={app.answers[q.key] ?? ""}
                            onChange={(e) => setAnswer(q.key, e.target.value)}
                            className="mt-2 min-h-[72px] bg-card text-sm"
                            aria-label={q.question}
                          />
                        ) : (
                          <Input
                            value={app.answers[q.key] ?? ""}
                            onChange={(e) => setAnswer(q.key, e.target.value)}
                            className="mt-2 h-9 bg-card text-sm"
                            aria-label={q.question}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
