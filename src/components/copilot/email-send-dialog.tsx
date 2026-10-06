"use client";

/**
 * EmailSendDialog — the "which email should we use?" chooser.
 * Both families are offered every time (with the last choice pre-selected):
 *   • Your mail app (mailto:) — phone/laptop default client
 *   • Gmail web compose
 *   • Outlook web compose
 *   • Copy text — paste anywhere
 * "Remember" stores the pre-selection for next time (never force-sends).
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCopilot } from "@/lib/copilot-store";
import {
  copyEmail,
  gmailUrl,
  mailtoUrl,
  outlookUrl,
  type EmailDraft,
} from "@/lib/email-templates";
import { Check, Copy, ExternalLink, Mail, Send } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  draft: EmailDraft | null;
  title?: string;
}

const OPTIONS = [
  {
    mode: "mailapp" as const,
    icon: <Mail className="h-5 w-5 text-indigo-500 dark:text-indigo-300" />,
    title: "Open in my mail app",
    desc: "Opens your device's default email app (iPhone Mail, Outlook desktop, …) with everything pre-filled",
  },
  {
    mode: "gmail" as const,
    icon: <ExternalLink className="h-5 w-5 text-rose-500 dark:text-rose-300" />,
    title: "Gmail web compose",
    desc: "Opens a new Gmail draft in this browser — you press send",
  },
  {
    mode: "outlook" as const,
    icon: <Send className="h-5 w-5 text-sky-500 dark:text-sky-300" />,
    title: "Outlook web compose",
    desc: "Opens a new Outlook/Office 365 draft — you press send",
  },
  {
    mode: "copy" as const,
    icon: <Copy className="h-5 w-5 text-emerald-500 dark:text-emerald-300" />,
    title: "Copy the email text",
    desc: "Copies subject + body to paste into any email or portal message box",
  },
];

export function EmailSendDialog({ open, onOpenChange, draft, title }: Props) {
  const { prefs, setPrefs } = useCopilot();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string>("mailapp");
  const [remember, setRemember] = useState(true);
  const [copied, setCopied] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  // reset selection each time the dialog opens (render-time adjustment pattern)
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSelected(prefs.emailMode !== "ask" ? prefs.emailMode : "mailapp");
      setCopied(false);
    }
  }

  if (!draft) return null;

  const go = () => {
    if (remember) setPrefs({ emailMode: selected as "mailapp" | "gmail" | "outlook" | "copy" });
    if (selected === "mailapp") {
      window.location.href = mailtoUrl(draft);
      onOpenChange(false);
      toast({ title: "Opening your mail app…", description: "The email is pre-filled — review and press send." });
    } else if (selected === "gmail" || selected === "outlook") {
      const url = selected === "gmail" ? gmailUrl(draft) : outlookUrl(draft);
      // open a new tab; if the browser blocks popups, fall back to a user-initiated
      // synthetic anchor so the compose window ALWAYS opens
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (!w) {
        const a = document.createElement("a");
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      onOpenChange(false);
      toast({
        title: selected === "gmail" ? "Gmail draft opened" : "Outlook draft opened",
        description: "Review the draft and press send in your webmail.",
      });
    } else {
      copyEmail(draft).then((ok) => {
        setCopied(ok);
        if (ok) toast({ title: "Email copied to clipboard", description: "Paste it into any email client or portal inbox." });
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{title ?? "How should we send this email?"}</DialogTitle>
          <DialogDescription>
            You stay in control — the email goes out <span className="font-semibold text-foreground">from your own account</span>,
            and you press the final send button.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {OPTIONS.map((o) => (
            <button
              key={o.mode}
              type="button"
              onClick={() => setSelected(o.mode)}
              className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${
                selected === o.mode
                  ? "border-primary bg-primary/10 ring-1 ring-primary/40"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">{o.icon}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                  {o.title}
                  {selected === o.mode && <Check className="h-4 w-4 text-primary" />}
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{o.desc}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-3 py-2.5">
          <div>
            <p className="text-xs font-medium text-foreground">Pre-select this choice next time</p>
            <p className="text-[10px] text-muted-foreground">We will still show this dialog — just faster.</p>
          </div>
          <Switch checked={remember} onCheckedChange={setRemember} aria-label="Remember my email choice" />
        </div>

        <div className="rounded-lg border border-border bg-muted/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">To:</span> {draft.to || "[add the recipient's email]"} ·{" "}
          <span className="font-semibold text-foreground">Subject:</span> {draft.subject}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={go} className="gap-1.5 font-semibold">
            {selected === "copy" && copied ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {selected === "copy" ? (copied ? "Copied!" : "Copy email") : "Continue"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
