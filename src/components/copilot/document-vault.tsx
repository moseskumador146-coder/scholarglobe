"use client";

/**
 * Document Vault — upload once, reuse everywhere.
 * Files are stored ONLY in this browser (IndexedDB) — nothing is uploaded.
 */

import { useRef, useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  DOC_TYPE_ICON,
  DOC_TYPE_LABEL,
  useCopilot,
  type DocType,
} from "@/lib/copilot-store";
import { Download, FileUp, Lock, Trash2 } from "lucide-react";

const ORDER: DocType[] = [
  "passport", "photo", "transcript", "degree", "englishTest", "moiCertificate",
  "cv", "sop", "recommendation", "feeWaiverEvidence", "other",
];

function fmtSize(b: number): string {
  return b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
}

export function DocumentVault() {
  const { docs, addDoc, removeDoc, downloadDoc, apps } = useCopilot();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<DocType>("transcript");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (const f of Array.from(files)) {
      if (f.size > 15 * 1024 * 1024) {
        toast({ title: `${f.name} is over 15 MB`, description: "Try compressing it — portals rarely accept huge files either.", variant: "destructive" });
        continue;
      }
      const done = await addDoc(f, type, label.trim() || undefined);
      if (done) ok += 1;
    }
    setBusy(false);
    setLabel("");
    if (fileRef.current) fileRef.current.value = "";
    if (ok > 0) toast({ title: `${ok} document${ok === 1 ? "" : "s"} saved in this browser`, description: "Nothing was uploaded — the files never leave your device." });
  };

  // Coverage — how many of each app's required docs exist in the vault
  const coverage = apps.map((app) => {
    const have = app.reqDocs.filter((r) => docs.some((d) => d.type === r.type)).length;
    return { app, have, total: app.reqDocs.length };
  });
  const readyCount = coverage.filter((c) => c.have === c.total).length;

  const grouped = ORDER.map((t) => ({ type: t, items: docs.filter((d) => d.type === t) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <Card className="border-dashed border-2 border-primary/40 bg-primary/5">
        <CardContent className="p-4 sm:p-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}
            className={`rounded-xl p-4 text-center transition ${drag ? "bg-primary/15 ring-2 ring-primary/50" : ""}`}
          >
            <FileUp className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-sm font-semibold text-foreground">
              {drag ? "Drop your files here" : "Drag & drop documents — or choose files"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PDFs, JPG, PNG · up to 15 MB each · stored only on this device
            </p>
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.webp"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button size="sm" className="mt-3 gap-1.5" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? "Saving…" : "Choose files"}
            </Button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">What kind of document is it?</Label>
              <Select value={type} onValueChange={(v) => setType(v as DocType)}>
                <SelectTrigger aria-label="Document type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORDER.map((t) => (
                    <SelectItem key={t} value={t}>
                      {DOC_TYPE_ICON[t]} {DOC_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-label" className="text-xs text-muted-foreground">
                Custom name <span className="opacity-60">(optional)</span>
              </Label>
              <Input id="doc-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. KNUCT transcript — final.pdf" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage against tracked applications */}
      {apps.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-sm font-semibold text-foreground">
            Document coverage for your {apps.length} application{apps.length === 1 ? "" : "s"}
          </p>
          <div className="mt-3 space-y-2">
            {coverage.map(({ app, have, total }) => (
              <div key={app.slug} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{app.name}</span>
                <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${total ? (have / total) * 100 : 0}%`,
                      background: have === total ? "var(--success)" : "var(--warning)",
                    }}
                  />
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 text-[10px] ${have === total ? "border-success/50 text-success" : "border-warning/50 text-warning"}`}
                >
                  {have}/{total} docs
                </Badge>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {readyCount === apps.length
              ? "All set — every tracked application's document list is fully covered. 🎉"
              : `${apps.length - readyCount} application${apps.length - readyCount === 1 ? "" : "s"} still missing documents — upload them above.`}
          </p>
        </div>
      )}

      {/* Vault list */}
      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Your vault is empty. Start with the essentials: passport, transcript, degree certificate and a passport photo.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((g) => (
            <div key={g.type}>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span>{DOC_TYPE_ICON[g.type]}</span> {DOC_TYPE_LABEL[g.type]}
                <Badge variant="secondary" className="ml-1 text-[10px]">{g.items.length}</Badge>
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {g.items.map((d) => (
                  <div key={d.id} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-border bg-card p-3">
                    <span className="text-xl">{DOC_TYPE_ICON[d.type]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-foreground">{d.label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {fmtSize(d.size)} · {new Date(d.addedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                        {d.note ? ` · ${d.note}` : ""}
                      </p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Download document" onClick={() => downloadDoc(d.id)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      aria-label="Delete document"
                      onClick={() => { removeDoc(d.id); toast({ title: "Document removed from this browser" }); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="flex items-start gap-1.5 rounded-lg bg-secondary/50 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
        Privacy by design: your documents and answers live only in this browser&apos;s storage. Clearing your browser data removes
        them — download copies you care about. Nothing is ever sent to a server.
      </p>
    </div>
  );
}
