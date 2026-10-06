"use client";

/**
 * Apply Co-Pilot — the 50-50 section: system prepares, user submits.
 * Tabs: Overview · Documents · Wizard · Submission Kits · Email Center
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_META, useCopilot } from "@/lib/copilot-store";
import { ApplicationWizard } from "@/components/copilot/application-wizard";
import { DocumentVault } from "@/components/copilot/document-vault";
import { EmailCenter } from "@/components/copilot/email-center";
import { SubmissionKits } from "@/components/copilot/submission-kits";
import { flagEmoji } from "@/components/opportunity-card";
import {
  CalendarClock,
  FolderLock,
  Handshake,
  ListChecks,
  Mail,
  Sparkles,
  Wand2,
} from "lucide-react";

export function ApplyCopilot() {
  const { apps, docs, profileCompletion } = useCopilot();

  const nextDeadlines = useMemo(
    () =>
      apps
        .filter((a) => a.deadlineIso && new Date(a.deadlineIso).getTime() > Date.now() - 86400000 && a.status !== "submitted")
        .sort((a, b) => new Date(a.deadlineIso!).getTime() - new Date(b.deadlineIso!).getTime())
        .slice(0, 4),
    [apps]
  );

  const submitted = apps.filter((a) => a.status === "submitted").length;
  const readyDocs = docs.length;

  return (
    <Tabs defaultValue="overview" className="w-full">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-secondary/70 p-1">
        <TabsTrigger value="overview" className="gap-1.5 text-xs"><Handshake className="h-3.5 w-3.5" /> Overview</TabsTrigger>
        <TabsTrigger value="documents" className="gap-1.5 text-xs"><FolderLock className="h-3.5 w-3.5" /> Documents {readyDocs > 0 && <Badge className="ml-0.5 h-4 px-1 text-[9px]">{readyDocs}</Badge>}</TabsTrigger>
        <TabsTrigger value="wizard" className="gap-1.5 text-xs"><Wand2 className="h-3.5 w-3.5" /> Wizard</TabsTrigger>
        <TabsTrigger value="kits" className="gap-1.5 text-xs"><ListChecks className="h-3.5 w-3.5" /> Kits {apps.length > 0 && <Badge className="ml-0.5 h-4 px-1 text-[9px]">{apps.length}</Badge>}</TabsTrigger>
        <TabsTrigger value="emails" className="gap-1.5 text-xs"><Mail className="h-3.5 w-3.5" /> Emails</TabsTrigger>
      </TabsList>

      {/* ── Overview ── */}
      <TabsContent value="overview" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* stat cards */}
          {[
            { label: "Applications tracked", value: String(apps.length), icon: <ListChecks className="h-4 w-4 text-primary" />, sub: submitted > 0 ? `${submitted} submitted 📮` : "add from any search card" },
            { label: "Documents in vault", value: String(readyDocs), icon: <FolderLock className="h-4 w-4 text-success" />, sub: "stored only on this device" },
            { label: "Profile completeness", value: `${profileCompletion}%`, icon: <Sparkles className="h-4 w-4 text-fuchsia-500" />, sub: "fuels AI drafts & emails" },
          ].map((s) => (
            <Card key={s.label} className="lift">
              <CardContent className="p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.icon} {s.label}</p>
                <p className="mt-1.5 text-3xl font-extrabold tracking-tight text-foreground">{s.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* next deadlines */}
        <Card className="mt-4">
          <CardContent className="p-4 sm:p-5">
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <CalendarClock className="h-4 w-4 text-warning" /> Next deadlines
            </p>
            {nextDeadlines.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {apps.length === 0
                  ? "Track an application and its deadline appears here with a countdown."
                  : "Nothing urgent — every tracked application is submitted or its window has passed."}
              </p>
            ) : (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {nextDeadlines.map((a) => {
                  const days = Math.ceil((new Date(a.deadlineIso!).getTime() - Date.now()) / 86400000);
                  return (
                    <div key={a.slug} className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-secondary/30 px-3 py-2.5">
                      <span className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg text-[10px] font-black leading-none ${days <= 21 ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                        {days}
                        <span className="text-[8px] font-semibold">DAYS</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-semibold text-foreground">{flagEmoji(a.countryCode)} {a.name}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">
                          {STATUS_META[a.status].icon} {STATUS_META[a.status].label} · closes {new Date(a.deadlineIso!).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* the deal */}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { t: "We prepare 80%", d: "Checklists from each programme's real rules, paste-ready answers, AI-drafted motivation letters, referee & admissions emails — all tailored per application.", i: "🤖" },
            { t: "You decide 20%", d: "You review every document and answer, choose where each email goes, and press the final submit on the official portal — the one click that must legally be yours.", i: "🧑" },
            { t: "You keep everything", d: "Documents, answers and progress stay in your browser only. Clear your data and it's gone — we keep nothing on any server.", i: "🔐" },
          ].map((c) => (
            <div key={c.t} className="rounded-2xl border border-border bg-card p-4">
              <p className="text-lg">{c.i}</p>
              <p className="mt-1 text-sm font-bold text-foreground">{c.t}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{c.d}</p>
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="documents" className="mt-4"><DocumentVault /></TabsContent>
      <TabsContent value="wizard" className="mt-4"><ApplicationWizard /></TabsContent>
      <TabsContent value="kits" className="mt-4"><SubmissionKits /></TabsContent>
      <TabsContent value="emails" className="mt-4"><EmailCenter /></TabsContent>
    </Tabs>
  );
}
