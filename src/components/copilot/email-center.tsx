"use client";

/**
 * Email Center — 7 application email templates in the student's own voice.
 * Both delivery families offered every time via the chooser:
 *   mail app (mailto:) · Gmail · Outlook · copy-to-clipboard
 */

import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCopilot,
} from "@/lib/copilot-store";
import { buildEmail, EMAIL_KINDS, type EmailDraft, type EmailKind } from "@/lib/email-templates";
import { flagEmoji } from "@/components/opportunity-card";
import { EmailSendDialog } from "@/components/copilot/email-send-dialog";
import { Mail, Send } from "lucide-react";

export function EmailCenter() {
  const { apps, profile, prefs } = useCopilot();
  const [kind, setKind] = useState<EmailKind>("referee");
  const [slug, setSlug] = useState<string>(apps[0]?.slug ?? "");
  const [refereeIdx, setRefereeIdx] = useState("0");
  const [note, setNote] = useState("");
  const [draft, setDraft] = useState<EmailDraft | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const meta = EMAIL_KINDS.find((k) => k.kind === kind)!;
  const app = useMemo(() => apps.find((a) => a.slug === slug) ?? apps[0] ?? null, [apps, slug]);

  const generate = () => {
    if (!app) return;
    const d = buildEmail(kind, profile, {
      id: app.id, slug: app.slug, name: app.name, kind: app.kind, provider: app.provider,
      country: app.country, countryCode: app.countryCode, officialUrl: app.officialUrl,
      feeConfirmedFree: app.feeLabel === "$0", feeAmount: 0, feeCurrency: "USD", feeUsd: 0,
      recommendationsRequired: false, recommendationsCount: null, recommendationsNote: null,
      unofficialTranscripts: false, transcriptsNote: null, essayRequired: false, essayNote: null,
      moiAccepted: app.moiAccepted, moiNote: null, englishTests: null,
      localLanguageRequired: false, localLanguageNote: null,
      cycle: { status: "OPEN", nextClose: app.deadlineIso ?? undefined, label: app.deadlineNote },
    }, {
      refereeName: profile.referees[Number(refereeIdx)]?.name,
      note: note.trim() || undefined,
    });
    setDraft(d);
    setDialogOpen(true);
  };

  const needsApp = kind !== "referee" || apps.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <Card className="self-start">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Mail className="h-4 w-4 text-primary" /> Email Autopilot
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              Every email is written in your voice and sent <span className="font-semibold text-foreground">from your own inbox</span> —
              we never store your password. You choose how it opens: your mail app, Gmail, Outlook, or copy &amp; paste.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">What do you need to send?</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {EMAIL_KINDS.map((k) => (
                <button
                  key={k.kind}
                  type="button"
                  onClick={() => setKind(k.kind)}
                  className={`rounded-xl border p-2.5 text-left transition ${
                    kind === k.kind ? "border-primary bg-primary/10 ring-1 ring-primary/40" : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <p className="text-xs font-bold text-foreground">{k.icon} {k.label}</p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{k.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {needsApp && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                {kind === "referee" ? "Which application is it for?" : "About which application?"}
              </Label>
              {apps.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-2.5 text-[11px] text-muted-foreground">
                  No tracked applications — emails will use your profile details. Add an application for programme-specific drafts.
                </p>
              ) : (
                <Select value={slug || apps[0]?.slug} onValueChange={setSlug}>
                  <SelectTrigger aria-label="Select application"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {apps.map((a) => (
                      <SelectItem key={a.slug} value={a.slug}>{flagEmoji(a.countryCode)} {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {kind === "referee" && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Send to which referee?</Label>
              {profile.referees.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-2.5 text-[11px] text-muted-foreground">
                  Add referees in the Wizard tab first — the email needs their name and address.
                </p>
              ) : (
                <Select value={refereeIdx} onValueChange={setRefereeIdx}>
                  <SelectTrigger aria-label="Select referee"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {profile.referees.map((r, i) => (
                      <SelectItem key={i} value={String(i)}>{r.name} — {r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="email-note" className="text-[11px] text-muted-foreground">
              Anything to add? <span className="opacity-60">(optional — woven into the email)</span>
            </Label>
            <Textarea
              id="email-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. my student ID, the exact module name, special circumstances…"
              className="min-h-[56px] text-sm"
            />
          </div>

          <Button className="w-full gap-2 font-semibold" onClick={generate} disabled={kind === "referee" && profile.referees.length === 0}>
            <Send className="h-4 w-4" /> Draft the email
          </Button>

          {prefs.emailMode !== "ask" && (
            <p className="text-center text-[10px] text-muted-foreground">
              Your saved send method: <Badge variant="secondary" className="text-[9px] uppercase">{prefs.emailMode}</Badge> (it&apos;s pre-selected, you can switch anytime)
            </p>
          )}
        </CardContent>
      </Card>

      {/* live preview */}
      <Card className="self-start">
        <CardContent className="p-4 sm:p-5">
          <p className="text-sm font-bold text-foreground">Preview</p>
          {draft ? (
            <div className="mt-3 space-y-2">
              <div className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
                <p><span className="font-bold text-foreground">To:</span> {draft.to || "[admissions email]"}</p>
                <p className="mt-0.5"><span className="font-bold text-foreground">Subject:</span> {draft.subject}</p>
              </div>
              <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-[11px] leading-relaxed text-foreground">
                {draft.body}
              </pre>
              <p className="text-[10px] text-muted-foreground">Press “Draft the email” → choose where it opens → review → you press send.</p>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Pick an email type and press <span className="font-semibold text-foreground">Draft the email</span> — a full preview appears here, then you choose how it&apos;s sent.
            </div>
          )}
        </CardContent>
      </Card>

      <EmailSendDialog open={dialogOpen} onOpenChange={setDialogOpen} draft={draft} />
    </div>
  );
}
