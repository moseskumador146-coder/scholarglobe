"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobeView, continentLegend, GlobePoint } from "@/components/globe-view";
import { Opportunity, OpportunityCard, flagEmoji } from "@/components/opportunity-card";
import { Pair, PairCard } from "@/components/pair-card";
import {
  ArrowDown,
  CalendarClock,
  CalendarRange,
  Globe2,
  Loader2,
  Rocket,
  Search,
  Sparkles,
  University,
} from "lucide-react";

const ORIGIN_COUNTRIES = [
  "Ghana", "Nigeria", "Kenya", "South Africa", "Egypt", "Ethiopia", "Uganda", "Tanzania", "Rwanda", "Zambia",
  "Zimbabwe", "Malawi", "Mozambique", "Botswana", "Senegal", "Côte d'Ivoire", "Cameroon", "Burkina Faso", "Mali", "Niger",
  "Togo", "Benin", "Sierra Leone", "Liberia", "The Gambia", "Guinea", "Gabon", "Congo", "Namibia", "Eswatini",
  "Pakistan", "India", "Bangladesh", "Nepal", "Sri Lanka", "Indonesia", "Philippines", "Vietnam", "Malaysia", "Thailand",
  "China", "Japan", "South Korea", "Turkey", "Jordan", "Lebanon", "Morocco", "Algeria", "Tunisia", "Libya",
  "Brazil", "Mexico", "Colombia", "Peru", "Ecuador", "Bolivia", "Argentina", "Chile",
];

const DESTINATIONS = [
  { value: "all", label: "🌍 Anywhere on Earth" },
  { value: "Europe", label: "🌐 Europe (continent)" },
  { value: "Asia", label: "🌐 Asia (continent)" },
  { value: "Middle East", label: "🌐 Middle East" },
  { value: "Africa", label: "🌐 Africa (continent)" },
  { value: "North America", label: "🌐 North America" },
  { value: "Oceania", label: "🌐 Oceania" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Germany", label: "🇩🇪 Germany" },
  { value: "France", label: "🇫🇷 France" },
  { value: "Sweden", label: "🇸🇪 Sweden" },
  { value: "Ireland", label: "🇮🇪 Ireland" },
  { value: "Belgium", label: "🇧🇪 Belgium" },
  { value: "Switzerland", label: "🇨🇭 Switzerland" },
  { value: "Hungary", label: "🇭🇺 Hungary" },
  { value: "Türkiye", label: "🇹🇷 Türkiye" },
  { value: "Italy", label: "🇮🇹 Italy" },
  { value: "Russia", label: "🇷🇺 Russia" },
  { value: "China", label: "🇨🇳 China" },
  { value: "Japan", label: "🇯🇵 Japan" },
  { value: "South Korea", label: "🇰🇷 South Korea" },
  { value: "Singapore", label: "🇸🇬 Singapore" },
  { value: "Hong Kong", label: "🇭🇰 Hong Kong" },
  { value: "India", label: "🇮🇳 India" },
  { value: "Saudi Arabia", label: "🇸🇦 Saudi Arabia" },
  { value: "United Arab Emirates", label: "🇦🇪 UAE" },
  { value: "United States", label: "🇺🇸 United States" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "New Zealand", label: "🇳🇿 New Zealand" },
  { value: "Ghana", label: "🇬🇭 Ghana (study at home)" },
  { value: "Cameroon", label: "🇨🇲 Cameroon (Pan-African)" },
];

const LEVELS = [
  { value: "all", label: "All levels" },
  { value: "undergraduate", label: "Undergraduate (Bachelor's)" },
  { value: "masters", label: "Master's" },
  { value: "phd", label: "PhD / Doctoral" },
];

const FIELDS = [
  { value: "any", label: "Any field of study" },
  { value: "engineering", label: "Engineering" },
  { value: "computer science", label: "Computer Science / IT" },
  { value: "medicine & health", label: "Medicine & Health" },
  { value: "natural sciences", label: "Natural Sciences" },
  { value: "mathematics", label: "Mathematics / Data" },
  { value: "agriculture & food", label: "Agriculture & Food" },
  { value: "business & economics", label: "Business & Economics" },
  { value: "social sciences", label: "Social Sciences" },
  { value: "public policy", label: "Public Policy / Governance" },
  { value: "development studies", label: "Development Studies" },
  { value: "environment", label: "Environment / Climate" },
  { value: "energy", label: "Energy" },
  { value: "law", label: "Law" },
  { value: "education", label: "Education" },
  { value: "arts & humanities", label: "Arts & Humanities" },
];

interface WebResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  date?: string;
  favicon?: string;
  feeMention?: boolean;
  freeMention?: boolean;
}

interface Stats {
  total: number;
  free: number;
  moi: number;
  universities: number;
  scholarships: number;
  freeUnis: number;
  lowFeeUnis: number;
  linked: number;
  openNow: number;
}

export default function Home() {
  const [origin, setOrigin] = useState("Ghana");
  const [destination, setDestination] = useState("all");
  const [level, setLevel] = useState("all");
  const [field, setField] = useState("any");
  const [q, setQ] = useState("");
  const [fee, setFee] = useState("low");
  const [moiOnly, setMoiOnly] = useState(false);

  const [results, setResults] = useState<Opportunity[]>([]);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [webResults, setWebResults] = useState<WebResult[]>([]);
  const [synthesis, setSynthesis] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState("curated");

  const [stats, setStats] = useState<Stats | null>(null);
  const [globeUnis, setGlobeUnis] = useState<GlobePoint[]>([]);
  const [globeSchol, setGlobeSchol] = useState<GlobePoint[]>([]);
  const [globeStatus, setGlobeStatus] = useState<GlobePoint[]>([]);
  const [openNow, setOpenNow] = useState<Opportunity[]>([]);
  const [upcoming, setUpcoming] = useState<Opportunity[]>([]);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(() => {});
    fetch("/api/globe?type=universities").then((r) => r.json()).then((d) => setGlobeUnis(d.points ?? [])).catch(() => {});
    fetch("/api/globe?type=scholarships").then((r) => r.json()).then((d) => setGlobeSchol(d.points ?? [])).catch(() => {});
    fetch("/api/globe?type=status").then((r) => r.json()).then((d) => setGlobeStatus(d.points ?? [])).catch(() => {});
    const base = "/api/opportunities?fee=free";
    fetch(`${base}&status=OPEN`).then((r) => r.json()).then((d) => setOpenNow(d.results ?? [])).catch(() => {});
    fetch(`${base}&status=UPCOMING`).then((r) => r.json()).then((d) => setUpcoming(d.results ?? [])).catch(() => {});
  }, []);

  const runSearch = useCallback(
    async (overrides?: { destination?: string; level?: string; field?: string }) => {
      const dest = overrides?.destination ?? destination;
      const lvl = overrides?.level ?? level;
      const fld = overrides?.field ?? field;
      if (overrides?.destination) setDestination(overrides.destination);
      if (overrides?.level) setLevel(overrides.level);
      if (overrides?.field) setField(overrides.field);

      setSearching(true);
      setSearched(true);
      const params = new URLSearchParams({
        origin,
        destination: dest,
        level: lvl,
        field: fld,
        fee,
        moiOnly: moiOnly ? "1" : "0",
        q,
      });
      try {
        const [opRes, webRes] = await Promise.all([
          fetch(`/api/opportunities?${params}`).then((r) => r.json()),
          fetch("/api/deep-search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ origin, destination: dest, level: lvl, field: fld }),
          }).then((r) => r.json()),
        ]);
        setResults(opRes.results ?? []);
        setPairs(opRes.pairs ?? []);
        setWebResults(webRes.results ?? []);
        setSynthesis(webRes.synthesis ?? null);
        setActiveTab("curated");
      } catch {
        setResults([]);
        setWebResults([]);
      } finally {
        setSearching(false);
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      }
    },
    [origin, destination, level, field, fee, moiOnly, q]
  );

  const upcomingByMonth = useMemo(() => {
    const groups = new Map<string, Opportunity[]>();
    for (const op of upcoming) {
      const d = op.cycle.nextOpen ? new Date(op.cycle.nextOpen) : null;
      const key = d
        ? d.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" })
        : "Later";
      const arr = groups.get(key) ?? [];
      arr.push(op);
      groups.set(key, arr);
    }
    return Array.from(groups.entries());
  }, [upcoming]);

  const nowMonth = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const destinationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of [...globeUnis, ...globeSchol]) counts.set(p.continent, (counts.get(p.continent) ?? 0) + p.size);
    return counts;
  }, [globeUnis, globeSchol]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/40">
              <Globe2 className="h-5 w-5 text-emerald-400" />
            </span>
            <span className="text-lg">
              Scholar<span className="text-emerald-400">Globe</span>
            </span>
            <Badge variant="outline" className="ml-1 hidden border-emerald-800 text-[10px] text-emerald-400 sm:inline-flex">
              $0-fee verified
            </Badge>
          </a>
          <nav className="hidden items-center gap-5 text-sm text-slate-400 md:flex">
            <a href="#search" className="hover:text-emerald-300">Search</a>
            <a href="#globes" className="hover:text-emerald-300">3 Globes</a>
            <a href="#open-now" className="hover:text-emerald-300">Open this season</a>
            <a href="#upcoming" className="hover:text-emerald-300">Upcoming</a>
          </nav>
        </div>
      </header>

      <main id="top" className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6">
        {/* ─── Hero + Search ────────────────────────────────────── */}
        <section className="relative overflow-hidden py-10 sm:py-14">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(600px 300px at 20% 0%, rgba(16,185,129,0.12), transparent), radial-gradient(600px 300px at 80% 10%, rgba(245,158,11,0.08), transparent)",
            }}
          />
          <div className="relative">
            <Badge variant="outline" className="mb-4 whitespace-normal border-emerald-800/80 bg-emerald-950/40 text-left leading-relaxed text-emerald-300">
              <Sparkles className="mr-1 h-3 w-3 shrink-0" />{" "}
              {stats
                ? `${stats.free} confirmed $0-fee programs · ${stats.lowFeeUnis} universities ≤ $30 to apply · ${stats.linked} uni↔scholarship links`
                : "Curated worldwide"}{" "}
              · {nowMonth}
            </Badge>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Every <span className="text-emerald-400">free-application</span> scholarship & university on Earth —
              matched to <span className="text-amber-300">your nationality</span>.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Deep-search verified programs from undergraduate to PhD with zero or ≤$30 application fees, English-test waivers
              for your country (Medium-of-Instruction), local language requirements, recommendation rules, transcript
              policies, deadlines open right now — and what opens next.
            </p>

            {/* Search panel */}
            <Card className="mt-8 border-slate-800 bg-slate-900/70 backdrop-blur">
              <CardContent className="p-4 sm:p-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="origin" className="text-xs text-slate-400">
                      I am searching from
                    </Label>
                    <Select value={origin} onValueChange={setOrigin}>
                      <SelectTrigger id="origin" className="border-slate-700 bg-slate-950">
                        <SelectValue placeholder="Country" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 border-slate-700 bg-slate-900">
                        {ORIGIN_COUNTRIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Destination</Label>
                    <Select value={destination} onValueChange={setDestination}>
                      <SelectTrigger className="border-slate-700 bg-slate-950">
                        <SelectValue placeholder="Anywhere" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 border-slate-700 bg-slate-900">
                        {DESTINATIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Degree level</Label>
                    <Select value={level} onValueChange={setLevel}>
                      <SelectTrigger className="border-slate-700 bg-slate-950">
                        <SelectValue placeholder="Any level" />
                      </SelectTrigger>
                      <SelectContent className="border-slate-700 bg-slate-900">
                        {LEVELS.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">Field of study</Label>
                    <Select value={field} onValueChange={setField}>
                      <SelectTrigger className="border-slate-700 bg-slate-950">
                        <SelectValue placeholder="Any field" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 border-slate-700 bg-slate-900">
                        {FIELDS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2">
                      <p className="mb-1 text-xs font-medium text-slate-200">Application fee</p>
                      <Select value={fee} onValueChange={setFee}>
                        <SelectTrigger className="h-8 border-slate-700 bg-slate-950 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-700 bg-slate-900">
                          <SelectItem value="free">$0 — free only</SelectItem>
                          <SelectItem value="low">≤ $30 or local equivalent</SelectItem>
                          <SelectItem value="all">Any fee</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2.5 sm:col-span-1">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200">English waiver for me</p>
                        <p className="truncate text-[10px] text-slate-500">MOI accepted from {origin}</p>
                      </div>
                      <Switch checked={moiOnly} onCheckedChange={setMoiOnly} />
                    </div>
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Keyword — e.g. water, AI, agriculture…"
                      className="border-slate-700 bg-slate-950 text-sm"
                      onKeyDown={(e) => e.key === "Enter" && runSearch()}
                    />
                  </div>
                  <Button
                    onClick={() => runSearch()}
                    disabled={searching}
                    size="lg"
                    className="h-12 bg-emerald-500 px-6 text-base font-semibold text-slate-950 hover:bg-emerald-400"
                  >
                    {searching ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Rocket className="mr-2 h-5 w-5" />}
                    Deep Search
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>Try:</span>
                  <button
                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 transition hover:border-emerald-600 hover:text-emerald-300"
                    onClick={() => {
                      setOrigin("Ghana"); setFee("free"); setMoiOnly(true);
                      runSearch({ destination: "Europe", level: "masters", field: "any" });
                    }}
                  >
                    Ghanaian → full scholarships in Europe, Master&apos;s, English-waived
                  </button>
                  <button
                    className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 transition hover:border-emerald-600 hover:text-emerald-300"
                    onClick={() => {
                      setOrigin("Ghana"); setFee("low"); setMoiOnly(false);
                      runSearch({ destination: "Asia", level: "phd", field: "computer science" });
                    }}
                  >
                    Ghanaian → PhD in Asia, CS, free to apply
                  </button>
                  <button
                    className="rounded-full border border-teal-700/60 px-3 py-1 text-teal-200 transition hover:border-teal-500 hover:text-teal-100"
                    onClick={() => {
                      setOrigin("Ghana"); setFee("low"); setMoiOnly(false);
                      runSearch({ destination: "all", level: "masters", field: "any" });
                    }}
                  >
                    Ghanaian → apply to both: university ≤$30 + linked scholarship
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ─── Results ──────────────────────────────────────────── */}
        <section ref={resultsRef} id="search" className="scroll-mt-16 pb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-bold sm:text-2xl">
              {searched ? "Your matched opportunities" : "Search the database"}
            </h2>
            {searched && (
              <p className="text-xs text-slate-500">
                Filters: {origin}-based · {destination === "all" ? "worldwide" : destination} ·{" "}
                {level === "all" ? "all levels" : level} {moiOnly ? "· English-waiver only" : ""} ·{" "}
                {fee === "free" ? "$0-fee only" : fee === "low" ? "fees ≤ $30 (or local)" : "any fee"}
              </p>
            )}
          </div>

          {!searched && (
            <Card className="border-dashed border-slate-800 bg-slate-900/40">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <Search className="h-10 w-10 text-slate-600" />
                <p className="max-w-md text-sm text-slate-400">
                  Pick your country, destination, level and field above — then hit{" "}
                  <span className="font-semibold text-emerald-400">Deep Search</span>. You&apos;ll get curated
                  $0-fee programs plus live web results in one pass.
                </p>
              </CardContent>
            </Card>
          )}

          {searched && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-slate-900">
                <TabsTrigger value="curated" className="data-[state=active]:bg-slate-800">
                  Curated matches ({results.length})
                </TabsTrigger>
                <TabsTrigger value="pairs" className="data-[state=active]:bg-slate-800">
                  🤝 Apply to both ({pairs.length})
                </TabsTrigger>
                <TabsTrigger value="web" className="data-[state=active]:bg-slate-800">
                  Deep web results ({webResults.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="curated" className="mt-4">
                {searching ? (
                  <div className="flex items-center gap-3 py-16 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" /> Searching the database…
                  </div>
                ) : results.length === 0 ? (
                  <Card className="border-dashed border-slate-800 bg-slate-900/40">
                    <CardContent className="py-10 text-center text-sm text-slate-400">
                      No curated match with these filters. Try switching off &quot;Free application only&quot; or widen
                      the destination — and check the Deep web tab for live results.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
                    {results.map((op) => (
                      <OpportunityCard key={op.id} op={op} originCountry={origin} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pairs" className="mt-4">
                {searching ? (
                  <div className="flex items-center gap-3 py-16 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" /> Building university + scholarship pairs…
                  </div>
                ) : pairs.length === 0 ? (
                  <Card className="border-dashed border-slate-800 bg-slate-900/40">
                    <CardContent className="py-10 text-center text-sm text-slate-400">
                      No university↔scholarship pairs match these filters — pairs appear when a linked scholarship shares
                      the filters with its university. Try widening the destination, level or fee filter.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-5">
                    <p className="text-xs leading-relaxed text-slate-500">
                      Each pair shows the <span className="font-semibold text-slate-300">university application</span> and
                      the <span className="font-semibold text-slate-300">funding application</span> side by side, with the
                      combined cost and a saved checklist — so you always know when you have{" "}
                      <span className="font-semibold text-teal-300">both done</span>.
                    </p>
                    {pairs.map((p) => (
                      <PairCard key={p.id} pair={p} originCountry={origin} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="web" className="mt-4">
                {searching ? (
                  <div className="flex items-center gap-3 py-16 text-slate-400">
                    <Loader2 className="h-5 w-5 animate-spin" /> Running 4 deep web queries + AI briefing…
                  </div>
                ) : webResults.length === 0 ? (
                  <Card className="border-dashed border-slate-800 bg-slate-900/40">
                    <CardContent className="py-10 text-center text-sm text-slate-400">
                      No live web results right now — the curated tab above is fully available.
                    </CardContent>
                  </Card>
                ) : (
                  <div>
                    {synthesis && (
                      <div className="mb-4 rounded-xl border border-emerald-800/60 bg-emerald-950/40 p-4 text-sm leading-relaxed text-emerald-100">
                        <p className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                          <span>
                            <strong className="text-emerald-300">AI briefing for {origin}:</strong> {synthesis}
                          </span>
                        </p>
                      </div>
                    )}
                    <div className="grid gap-3 lg:grid-cols-2 [&>*]:min-w-0">
                      {webResults.map((w) => (
                        <a
                          key={w.url}
                          href={w.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group rounded-xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-emerald-700"
                        >
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            {w.favicon ? (
                              <img src={w.favicon} alt="" className="h-4 w-4 rounded" />
                            ) : (
                              <Globe2 className="h-3.5 w-3.5" />
                            )}
                            <span className="truncate">{w.host_name}</span>
                            {w.date && <span aria-hidden>·</span>}
                            {w.date && <span>{w.date}</span>}
                          </div>
                          <h3 className="mt-1.5 text-sm font-semibold leading-snug text-slate-100 group-hover:text-emerald-300">
                            {w.name}
                          </h3>
                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-400">{w.snippet}</p>
                          {(w.freeMention || w.feeMention) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {w.freeMention && (
                                <span className="rounded-full border border-emerald-700/60 bg-emerald-950/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  free / waiver mentioned
                                </span>
                              )}
                              {w.feeMention && (
                                <span className="rounded-full border border-teal-700/60 bg-teal-950/40 px-2 py-0.5 text-[10px] text-teal-300">
                                  fee amounts mentioned
                                </span>
                              )}
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </section>

        {/* ─── 3 Globes ─────────────────────────────────────────── */}
        <section id="globes" className="scroll-mt-16 border-t border-slate-800/60 py-12">
          <div className="mb-6">
            <h2 className="text-xl font-bold sm:text-2xl">The world in 3 globes</h2>
            <p className="mt-1 text-sm text-slate-400">
              Click any country point — or the continent chips below — to filter your results. Colors show continents
              (globes 1-2) and opening status (globe 3).
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <GlobeView
              points={globeUnis}
              title="Globe 1 — Universities: $0 or ≤$30 to apply"
              subtitle="Free-apply & low-fee institutions by country"
              legend={continentLegend(globeUnis)}
              onCountrySelect={(c) => runSearch({ destination: c })}
            />
            <GlobeView
              points={globeSchol}
              title="Globe 2 — Scholarships by country"
              subtitle="Fully & partially funded awards you can apply to free"
              legend={continentLegend(globeSchol)}
              onCountrySelect={(c) => runSearch({ destination: c })}
            />
            <GlobeView
              points={globeStatus}
              title="Globe 3 — Open now vs upcoming"
              subtitle="Green = open/rolling · Amber = opens soon · Grey = closed"
              legend={[
                { label: "Open now", color: "#10b981" },
                { label: "Rolling", color: "#34d399" },
                { label: "Upcoming", color: "#f59e0b" },
                { label: "Closed", color: "#6b7280" },
              ]}
              onCountrySelect={(c) => runSearch({ destination: c })}
            />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {["Europe", "Asia", "Middle East", "Africa", "North America", "Oceania"].map((c) => {
              const count = destinationCounts.get(c) ?? 0;
              return (
                <button
                  key={c}
                  onClick={() => runSearch({ destination: c })}
                  className="rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:border-emerald-600 hover:text-emerald-300"
                >
                  {c} <span className="text-slate-500">({count})</span>
                </button>
              );
            })}
            <button
              onClick={() => runSearch({ destination: "all" })}
              className="rounded-full border border-emerald-800 bg-emerald-950/50 px-4 py-1.5 text-xs font-semibold text-emerald-300 transition hover:border-emerald-500"
            >
              Show the whole world
            </button>
          </div>
        </section>

        {/* ─── Open this season ─────────────────────────────────── */}
        <section id="open-now" className="scroll-mt-16 border-t border-slate-800/60 py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
                </span>
                Open this season — {nowMonth}
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                {openNow.length} free-apply programs with windows open or rolling right now.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800"
              onClick={() => runSearch({ destination: destination === "all" ? "all" : destination })}
            >
              <ArrowDown className="mr-1 h-4 w-4" /> Filter these in search
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            {openNow.slice(0, 8).map((op) => (
              <OpportunityCard key={op.id} op={op} originCountry={origin} />
            ))}
          </div>
          {openNow.length > 8 && (
            <p className="mt-4 text-xs text-slate-500">
              + {openNow.length - 8} more open programs — run a Deep Search to see them with your filters.
            </p>
          )}
        </section>

        {/* ─── Upcoming openings ────────────────────────────────── */}
        <section id="upcoming" className="scroll-mt-16 border-t border-slate-800/60 py-12">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
              <CalendarRange className="h-6 w-6 text-amber-400" /> Upcoming openings
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Plan backwards from these dates — grouped by the month each window opens.
            </p>
          </div>

          {upcomingByMonth.length === 0 ? (
            <p className="text-sm text-slate-400">No upcoming windows found — everything is open or rolling.</p>
          ) : (
            <div className="space-y-8">
              {upcomingByMonth.map(([month, ops]) => (
                <div key={month}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-base font-semibold text-amber-300">{month}</h3>
                    <div className="h-px flex-1 bg-slate-800" />
                    <Badge variant="outline" className="border-slate-700 text-[11px] text-slate-400">
                      {ops.length} window{ops.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
                    {ops.map((op) => (
                      <button
                        key={op.id}
                        onClick={() => runSearch({ destination: op.country === "Multiple EU countries" ? "Europe" : op.country })}
                        className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 text-left transition hover:border-amber-700/60"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-100">
                            {flagEmoji(op.countryCode)} {op.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {op.country} · {op.levels.split(",").join(" / ")} · {op.feeConfirmedFree ? "$0 fee" : "fee applies"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="flex items-center gap-1 text-xs font-semibold text-amber-300">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {op.cycle.nextOpen
                              ? new Date(op.cycle.nextOpen).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
                              : "TBA"}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            closes{" "}
                            {op.cycle.nextClose
                              ? new Date(op.cycle.nextClose).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
                              : "—"}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ─── How-to strip ─────────────────────────────────────── */}
        <section className="border-t border-slate-800/60 py-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: <University className="h-5 w-5 text-emerald-400" />,
                title: "Every program is hand-verified",
                body: "Free-apply status, English-waiver rules (MOI), transcript policies, recommendation counts and language requirements are curated per country — including exactly what Ghanaians, Nigerians, Kenyans and other nationalities need.",
              },
              {
                icon: <Globe2 className="h-5 w-5 text-amber-400" />,
                title: "3 live globes, 1 click away",
                body: "Universities, scholarships and seasonal openings mapped by continent and country. Click a country to pull its programs instantly.",
              },
              {
                icon: <Rocket className="h-5 w-5 text-teal-300" />,
                title: "Deep web + curated in one pass",
                body: "Four crafted live web queries run in parallel with the curated database — every result tagged for fee signals and wrapped in an AI briefing, so you never miss a newly-announced window or a ≤$30 application.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                {f.icon}
                <h3 className="mt-3 text-sm font-semibold text-slate-100">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* ─── Footer (sticky bottom) ─────────────────────────────── */}
      <footer className="mt-auto border-t border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-3 text-xs text-slate-500 sm:flex-row sm:items-center">
            <p>
              <span className="font-semibold text-slate-300">ScholarGlobe</span> — free-application scholarships &
              universities worldwide. Data is curated for research purposes; always verify details on the official
              program pages before paying anything.
            </p>
            <p>Never pay an agent for a $0 application.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
