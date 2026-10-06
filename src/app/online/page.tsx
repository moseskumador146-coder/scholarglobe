"use client";

/**
 * /online — dedicated page for free ONLINE learning:
 *   free online degrees · tuition-free universities · master's/PhD via distance
 *   · free professional certificates (Google, IBM, Cisco, FAO, SAP, UN…)
 * Same privacy-first Apply Co-Pilot works here too.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Opportunity, OpportunityCard } from "@/components/opportunity-card";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  ArrowLeft,
  Globe2,
  Laptop,
  Loader2,
  Rocket,
  ScrollText,
  Search,
  Sparkles,
  Wifi,
} from "lucide-react";

const ORIGIN_COUNTRIES = [
  "Ghana", "Nigeria", "Kenya", "South Africa", "Egypt", "Ethiopia", "Uganda", "Tanzania", "Rwanda", "Zambia",
  "Zimbabwe", "Cameroon", "Senegal", "Côte d'Ivoire", "Pakistan", "India", "Bangladesh", "Nepal", "Sri Lanka",
  "Indonesia", "Philippines", "Vietnam", "Malaysia", "Other nationality",
];

const LEVELS = [
  { value: "all", label: "All levels" },
  { value: "certificate", label: "Professional certificates" },
  { value: "undergraduate", label: "Online Bachelor's" },
  { value: "masters", label: "Online Master's" },
  { value: "phd", label: "Doctoral (research)" },
];

const FIELDS = [
  { value: "any", label: "Any field" },
  { value: "computer science", label: "Computer Science / IT" },
  { value: "business & economics", label: "Business & Economics" },
  { value: "education", label: "Education" },
  { value: "agriculture & food", label: "Agriculture & Food" },
  { value: "environment", label: "Environment / Climate" },
  { value: "development studies", label: "Development Studies" },
  { value: "medicine & health", label: "Medicine & Health" },
  { value: "social sciences", label: "Social Sciences" },
  { value: "engineering", label: "Engineering" },
  { value: "mathematics", label: "Mathematics / Data" },
  { value: "arts & humanities", label: "Arts & Humanities" },
  { value: "law", label: "Law" },
];

interface WebResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  date?: string;
  freeMention?: boolean;
}

interface Stats {
  online: number;
  free: number;
}

export default function OnlinePage() {
  const [origin, setOrigin] = useState("Ghana");
  const [level, setLevel] = useState("all");
  const [field, setField] = useState("any");
  const [q, setQ] = useState("");
  const [moiOnly, setMoiOnly] = useState(false);
  const [results, setResults] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);

  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [webBusy, setWebBusy] = useState(false);
  const [webDone, setWebDone] = useState(false);

  const runSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        kind: "ONLINE",
        fee: "all",
        level,
        field,
        moiOnly: moiOnly ? "1" : "0",
        q,
      });
      const d = await fetch(`/api/opportunities?${params}`).then((r) => r.json());
      setResults(d.results ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearched(true);
      setLoading(false);
    }
  }, [level, field, moiOnly, q]);

  // initial load + reload whenever filters change (instant, no button needed)
  useEffect(() => {
    runSearch();
  }, [runSearch]);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  const runDeepSearch = async () => {
    setWebBusy(true);
    setWebResults([]);
    setBriefing(null);
    try {
      const d = await fetch("/api/deep-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin, level, field, mode: "online" }),
      }).then((r) => r.json());
      setWebResults(d.results ?? []);
      setBriefing(d.synthesis ?? null);
      setWebDone(true);
    } catch {
      setWebResults([]);
    } finally {
      setWebBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* header */}
      <header className="glass sticky top-0 z-40 border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> ScholarGlobe home
          </Link>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="hidden border-teal-500/50 text-[10px] text-teal-600 dark:text-teal-300 sm:inline-flex">
              <Wifi className="mr-1 h-3 w-3" /> 100% online · 100% free to learn
            </Badge>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        {/* hero */}
        <section className="relative overflow-hidden py-10 sm:py-14">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="orb-a absolute -top-16 left-[10%] h-56 w-56 rounded-full bg-gradient-to-br from-teal-400/25 to-emerald-400/10 blur-3xl" />
            <div className="orb-b absolute top-0 right-[8%] h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/20 to-fuchsia-400/10 blur-3xl" />
          </div>
          <div className="relative">
            <Badge variant="outline" className="mb-4 whitespace-normal border-teal-500/40 bg-teal-500/5 px-3 py-1 text-left leading-relaxed text-teal-700 dark:text-teal-300">
              <Laptop className="mr-1 h-3 w-3 shrink-0" />
              {stats ? `${stats.online} curated free online offerings · ${stats.free} total $0-fee programs in the database` : "Curated & verified"} · no IELTS for most · study from anywhere
            </Badge>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-4xl sm:leading-[1.08]">
              Free <span className="text-gradient-animated">online degrees, master&apos;s &amp; professional certificates</span> — study from home, pay nothing.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              For students who need their first credentials from home: tuition-free accredited online universities
              (University of the People, IOU, IGNOU, UVS), free professional certificates that employers recognize
              (Google, IBM, Cisco, Microsoft, FAO, SAP, UN) and aid paths that make paid certificates free. Every entry
              shows exactly what is free — the learning, the certificate, or both.
            </p>
          </div>
        </section>

        {/* filters */}
        <section className="pb-8">
          <Card className="border-border bg-card/80 shadow-lg backdrop-blur">
            <CardContent className="p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label htmlFor="online-origin" className="text-xs font-medium text-muted-foreground">I am searching from</Label>
                  <Select value={origin} onValueChange={setOrigin}>
                    <SelectTrigger id="online-origin" className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ORIGIN_COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">What do you want?</Label>
                  <Select value={level} onValueChange={setLevel}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {LEVELS.map((l) => (
                        <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Field</Label>
                  <Select value={field} onValueChange={setField}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {FIELDS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="online-q" className="text-xs font-medium text-muted-foreground">Keyword</Label>
                  <div className="flex gap-2">
                    <Input
                      id="online-q"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      placeholder="e.g. AI, data, agriculture…"
                      className="h-11"
                    />
                    <Button onClick={runSearch} disabled={loading} className="h-11 gap-1.5 px-4">
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      <span className="hidden sm:inline">Filter</span>
                    </Button>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">No-English-test options only</p>
                    <p className="truncate text-[10px] text-muted-foreground">Skip anything that demands IELTS/TOEFL</p>
                  </div>
                  <Switch checked={moiOnly} onCheckedChange={setMoiOnly} aria-label="Only options without English tests" />
                </div>
                <Button
                  onClick={runDeepSearch}
                  disabled={webBusy}
                  size="lg"
                  className="h-12 gap-2 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 px-6 text-base font-bold text-white shadow-lg shadow-teal-500/30 transition hover:opacity-90 active:scale-[0.98] dark:from-teal-500 dark:via-emerald-500 dark:to-cyan-500"
                >
                  {webBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                  AI deep search the live web
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* results */}
        <section className="pb-16">
          <Tabs defaultValue="curated">
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-secondary/70 p-1">
              <TabsTrigger value="curated" className="gap-1.5 text-xs">
                <ScrollText className="h-3.5 w-3.5" /> Curated ({loading ? "…" : results.length})
              </TabsTrigger>
              <TabsTrigger value="web" className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Deep web {webDone ? `(${webResults.length})` : ""}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="curated" className="mt-4">
              {loading ? (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading free online offerings…
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <p className="text-sm font-semibold text-foreground">Nothing matches these filters</p>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                    Try widening the level or clearing the keyword — every online offering in the database is free or
                    near-free.
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {results.map((op) => (
                    <OpportunityCard key={op.slug} op={op} originCountry={origin} />
                  ))}
                </div>
              )}
              {searched && !loading && results.length > 0 && (
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Press ＋ Co-Pilot on any card — the document checklist, portal answers and emails adapt to online
                  programmes (most need no passport scan until enrollment, and no IELTS at all).
                </p>
              )}
            </TabsContent>

            <TabsContent value="web" className="mt-4">
              {webBusy && (
                <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Running 4 deep web queries for free online learning + AI briefing…
                </div>
              )}
              {!webBusy && !webDone && (
                <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
                  <p className="text-sm font-semibold text-foreground">Search the live web with AI</p>
                  <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                    Press <span className="font-semibold">AI deep search</span> above — we run 4 crafted queries on
                    tuition-free universities, free certificates, funded online master&apos;s and English-waiver paths,
                    then an AI briefing tells you what to do next.
                  </p>
                </div>
              )}
              {!webBusy && webDone && (
                <div>
                  {briefing && (
                    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs leading-relaxed text-foreground">
                      <strong className="text-primary">AI briefing for {origin}:</strong>{" "}
                      {briefing}
                    </div>
                  )}
                  {webResults.length === 0 ? (
                    <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
                      No live results right now — the curated tab above is still fully available.
                    </p>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {webResults.map((w) => (
                        <a
                          key={w.url}
                          href={w.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group rounded-xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-md"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold">{w.host_name}</span>
                            {w.freeMention && (
                              <span className="rounded-full border border-success/50 bg-success/10 px-2 py-0.5 font-semibold text-success">
                                free / aid mentioned
                              </span>
                            )}
                          </div>
                          <h3 className="mt-1.5 text-sm font-bold leading-snug text-foreground group-hover:text-primary">
                            {w.name}
                          </h3>
                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{w.snippet}</p>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        <footer className="border-t border-border/70 py-8 text-center text-xs text-muted-foreground">
          <p className="flex items-center justify-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5" /> ScholarGlobe — free applications, free tuition, free certificates.
          </p>
          <p className="mt-1">
            Links verified October 2026. Always confirm details on the official page — programmes change their terms.
          </p>
          <Link href="/" className="mt-2 inline-block font-semibold text-primary hover:underline">
            ← Back to campus scholarships &amp; universities
          </Link>
        </footer>
      </main>
    </div>
  );
}
