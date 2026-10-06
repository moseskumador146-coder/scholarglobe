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
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal } from "@/components/reveal";
import { ApplyCopilot } from "@/components/copilot/apply-copilot";
import {
  ArrowDown,
  CalendarClock,
  CalendarRange,
  Globe2,
  Handshake,
  Loader2,
  Menu,
  Rocket,
  Search,
  Sparkles,
  University,
  X,
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
  { value: "Europe", label: "🇪🇺 Europe" },
  { value: "Asia", label: "🌏 Asia" },
  { value: "Middle East", label: "🌐 Middle East" },
  { value: "Africa", label: "🌍 Africa (continent)" },
  { value: "North America", label: "🌎 North America" },
  { value: "Oceania", label: "🏝️ Oceania" },
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

const NAV_LINKS = [
  { href: "#search", label: "Search" },
  { href: "#copilot", label: "Apply Co-Pilot" },
  { href: "#globes", label: "3 Globes" },
  { href: "#open-now", label: "Open now" },
  { href: "#upcoming", label: "Upcoming" },
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
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="glass sticky top-0 z-40 border-b border-border/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2 font-extrabold tracking-tight">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30">
              <Globe2 className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg">
              Scholar<span className="text-gradient">Globe</span>
            </span>
            <Badge variant="outline" className="ml-1 hidden border-success/50 text-[10px] text-success md:inline-flex">
              $0-fee verified
            </Badge>
          </a>

          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="hidden gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 font-semibold text-white shadow-md shadow-indigo-500/25 hover:opacity-90 sm:inline-flex dark:from-indigo-500 dark:to-violet-500">
              <a href="#copilot">
                <Handshake className="h-4 w-4" /> Apply Co-Pilot
              </a>
            </Button>
            <Button
              size="icon"
              variant="outline"
              className="h-9 w-9 rounded-full lg:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              onClick={() => setMenuOpen((m) => !m)}
            >
              {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        {menuOpen && (
          <nav className="glass border-t border-border/70 px-4 py-3 lg:hidden">
            <div className="grid gap-1">
              {NAV_LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition hover:bg-accent"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="top" className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6">
        {/* ─── Hero + Search ────────────────────────────────────── */}
        <section className="relative overflow-hidden py-10 sm:py-16">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="orb-a absolute -top-20 left-[8%] h-64 w-64 rounded-full bg-gradient-to-br from-indigo-500/25 to-violet-500/10 blur-3xl" />
            <div className="orb-b absolute -top-10 right-[6%] h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-400/10 blur-3xl" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(700px 320px at 18% 0%, var(--hero-glow-1), transparent), radial-gradient(640px 320px at 82% 6%, var(--hero-glow-2), transparent), radial-gradient(520px 300px at 50% 30%, var(--hero-glow-3), transparent)",
              }}
            />
          </div>

          <div className="relative">
            <Reveal>
              <Badge variant="outline" className="mb-5 whitespace-normal border-primary/40 bg-primary/5 px-3 py-1 text-left leading-relaxed text-primary">
                <Sparkles className="mr-1 h-3 w-3 shrink-0" />{" "}
                {stats
                  ? `${stats.free} confirmed $0-fee programs · ${stats.lowFeeUnis} universities ≤ $30 to apply · ${stats.linked} uni↔scholarship links`
                  : "Curated worldwide"}{" "}
                · {nowMonth}
              </Badge>
            </Reveal>

            <Reveal delay={80}>
              <h1 className="max-w-3xl text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-5xl sm:leading-[1.08]">
                Every <span className="text-gradient-animated">free-application</span> scholarship &amp; university on
                Earth — matched to <span className="text-warning">your nationality</span>.
              </h1>
            </Reveal>

            <Reveal delay={150}>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Deep-search verified programs from undergraduate to PhD with zero or ≤$30 application fees, English-test
                waivers for your country (Medium-of-Instruction), local language requirements, recommendation rules,
                transcript policies, deadlines open right now — and an{" "}
                <span className="font-semibold text-foreground">Apply Co-Pilot</span> that prepares the whole
                application with you.
              </p>
            </Reveal>

            {/* Search panel */}
            <Reveal delay={220}>
              <Card className="mt-8 border-border bg-card/80 shadow-xl shadow-primary/5 backdrop-blur">
                <CardContent className="p-4 sm:p-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="origin" className="text-xs font-medium text-muted-foreground">
                        I am searching from
                      </Label>
                      <Select value={origin} onValueChange={setOrigin}>
                        <SelectTrigger id="origin" className="h-11">
                          <SelectValue placeholder="Country" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {ORIGIN_COUNTRIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Destination</Label>
                      <Select value={destination} onValueChange={setDestination}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Anywhere" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {DESTINATIONS.map((d) => (
                            <SelectItem key={d.value} value={d.value}>
                              {d.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Degree level</Label>
                      <Select value={level} onValueChange={setLevel}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Any level" />
                        </SelectTrigger>
                        <SelectContent>
                          {LEVELS.map((l) => (
                            <SelectItem key={l.value} value={l.value}>
                              {l.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Field of study</Label>
                      <Select value={field} onValueChange={setField}>
                        <SelectTrigger className="h-11">
                          <SelectValue placeholder="Any field" />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
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
                      <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2">
                        <p className="mb-1 text-xs font-semibold text-foreground">Application fee</p>
                        <Select value={fee} onValueChange={setFee}>
                          <SelectTrigger className="h-8 border-none bg-transparent text-xs shadow-none">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="free">$0 — free only</SelectItem>
                            <SelectItem value="low">≤ $30 or local equivalent</SelectItem>
                            <SelectItem value="all">Any fee</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground">English waiver for me</p>
                          <p className="truncate text-[10px] text-muted-foreground">MOI accepted from {origin}</p>
                        </div>
                        <Switch checked={moiOnly} onCheckedChange={setMoiOnly} />
                      </div>
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Keyword — e.g. water, AI, agriculture…"
                        className="h-11 text-sm"
                        onKeyDown={(e) => e.key === "Enter" && runSearch()}
                      />
                    </div>
                    <Button
                      onClick={() => runSearch()}
                      disabled={searching}
                      size="lg"
                      className="h-12 gap-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-7 text-base font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:opacity-90 active:scale-[0.98] dark:from-indigo-500 dark:via-violet-500 dark:to-fuchsia-500"
                    >
                      {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Rocket className="h-5 w-5" />}
                      Deep Search
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">Try:</span>
                    <button
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-foreground transition hover:border-primary hover:text-primary"
                      onClick={() => {
                        setOrigin("Ghana"); setFee("free"); setMoiOnly(true);
                        runSearch({ destination: "Europe", level: "masters", field: "any" });
                      }}
                    >
                      Ghanaian → full scholarships in Europe, Master&apos;s, English-waived
                    </button>
                    <button
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-foreground transition hover:border-primary hover:text-primary"
                      onClick={() => {
                        setOrigin("Ghana"); setFee("low"); setMoiOnly(false);
                        runSearch({ destination: "Asia", level: "phd", field: "computer science" });
                      }}
                    >
                      Ghanaian → PhD in Asia, CS, free to apply
                    </button>
                    <button
                      className="rounded-full border border-teal-500/50 bg-teal-500/10 px-3 py-1.5 font-medium text-teal-700 transition hover:border-teal-500 dark:text-teal-300"
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
            </Reveal>
          </div>
        </section>

        {/* ─── Results ──────────────────────────────────────────── */}
        <section ref={resultsRef} id="search" className="scroll-mt-20 pb-12">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              {searched ? "Your matched opportunities" : "Search the database"}
            </h2>
            {searched && (
              <p className="text-xs text-muted-foreground">
                Filters: {origin}-based · {destination === "all" ? "worldwide" : destination} ·{" "}
                {level === "all" ? "all levels" : level} {moiOnly ? "· English-waiver only" : ""} ·{" "}
                {fee === "free" ? "$0-fee only" : fee === "low" ? "fees ≤ $30 (or local)" : "any fee"}
              </p>
            )}
          </div>

          {!searched && (
            <Card className="border-dashed bg-card/50">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/15 to-fuchsia-500/15">
                  <Search className="h-7 w-7 text-primary" />
                </span>
                <p className="max-w-md text-sm text-muted-foreground">
                  Pick your country, destination, level and field above — then hit{" "}
                  <span className="font-semibold text-primary">Deep Search</span>. You&apos;ll get curated $0-fee
                  programs plus live web results in one pass.
                </p>
              </CardContent>
            </Card>
          )}

          {searched && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-auto w-full flex-wrap justify-start bg-secondary/70">
                <TabsTrigger value="curated" className="text-xs sm:text-sm">
                  Curated matches ({results.length})
                </TabsTrigger>
                <TabsTrigger value="pairs" className="text-xs sm:text-sm">
                  🤝 Apply to both ({pairs.length})
                </TabsTrigger>
                <TabsTrigger value="web" className="text-xs sm:text-sm">
                  Deep web ({webResults.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="curated" className="mt-4">
                {searching ? (
                  <div className="flex items-center gap-3 py-16 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Searching the database…
                  </div>
                ) : results.length === 0 ? (
                  <Card className="border-dashed bg-card/50">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
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
                  <div className="flex items-center gap-3 py-16 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Building university + scholarship pairs…
                  </div>
                ) : pairs.length === 0 ? (
                  <Card className="border-dashed bg-card/50">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      No university↔scholarship pairs match these filters — pairs appear when a linked scholarship
                      shares the filters with its university. Try widening the destination, level or fee filter.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-5">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Each pair shows the <span className="font-semibold text-foreground">university application</span>{" "}
                      and the <span className="font-semibold text-foreground">funding application</span> side by side,
                      with the combined cost and a saved checklist — so you always know when you have{" "}
                      <span className="font-semibold text-success">both done</span>.
                    </p>
                    {pairs.map((p) => (
                      <PairCard key={p.id} pair={p} originCountry={origin} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="web" className="mt-4">
                {searching ? (
                  <div className="flex items-center gap-3 py-16 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Running 4 deep web queries + AI briefing…
                  </div>
                ) : webResults.length === 0 ? (
                  <Card className="border-dashed bg-card/50">
                    <CardContent className="py-10 text-center text-sm text-muted-foreground">
                      No live web results right now — the curated tab above is fully available.
                    </CardContent>
                  </Card>
                ) : (
                  <div>
                    {synthesis && (
                      <div className="mb-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-fuchsia-500/5 p-4 text-sm leading-relaxed">
                        <p className="flex items-start gap-2">
                          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>
                            <strong className="text-primary">AI briefing for {origin}:</strong>{" "}
                            <span className="text-foreground/90">{synthesis}</span>
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
                          className="lift group rounded-2xl border border-border bg-card p-4"
                        >
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {w.favicon ? (
                              <img src={w.favicon} alt="" className="h-4 w-4 rounded" />
                            ) : (
                              <Globe2 className="h-3.5 w-3.5" />
                            )}
                            <span className="truncate">{w.host_name}</span>
                            {w.date && <span aria-hidden>·</span>}
                            {w.date && <span>{w.date}</span>}
                          </div>
                          <h3 className="mt-1.5 text-sm font-bold leading-snug text-foreground group-hover:text-primary">
                            {w.name}
                          </h3>
                          <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{w.snippet}</p>
                          {(w.freeMention || w.feeMention) && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {w.freeMention && (
                                <span className="rounded-full border border-success/50 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                                  free / waiver mentioned
                                </span>
                              )}
                              {w.feeMention && (
                                <span className="rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
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

        {/* ─── Apply Co-Pilot ───────────────────────────────────── */}
        <section id="copilot" className="scroll-mt-20 border-t border-border/70 py-12">
          <Reveal>
            <div className="mb-6">
              <Badge variant="outline" className="mb-2 gap-1 border-fuchsia-500/40 bg-fuchsia-500/10 text-[11px] font-semibold text-fuchsia-600 dark:text-fuchsia-300">
                <Handshake className="h-3 w-3" /> NEW — 50-50 applications
              </Badge>
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">Apply Co-Pilot — we prepare, you submit</h2>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
                The co-pilot collects your documents once, drafts every answer and email, and builds a submission kit per
                application — you review, choose, and press the final button on the official portal. Everything stays in
                your browser.
              </p>
            </div>
          </Reveal>
          <Reveal delay={100}>
            <ApplyCopilot />
          </Reveal>
        </section>

        {/* ─── 3 Globes ─────────────────────────────────────────── */}
        <section id="globes" className="scroll-mt-20 border-t border-border/70 py-12">
          <Reveal>
            <div className="mb-6">
              <h2 className="text-xl font-extrabold tracking-tight sm:text-2xl">The world in 3 realistic globes</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Real terrain, oceans and a live starfield. Click any country badge — or the continent chips below — to
                filter your results.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 lg:grid-cols-3">
            <Reveal><GlobeView
              points={globeUnis}
              title="Globe 1 — Universities: $0 or ≤$30 to apply"
              subtitle="Free-apply & low-fee institutions by country"
              legend={continentLegend(globeUnis)}
              onCountrySelect={(c) => runSearch({ destination: c })}
            /></Reveal>
            <Reveal delay={90}><GlobeView
              points={globeSchol}
              title="Globe 2 — Scholarships by country"
              subtitle="Fully & partially funded awards you can apply to free"
              legend={continentLegend(globeSchol)}
              onCountrySelect={(c) => runSearch({ destination: c })}
            /></Reveal>
            <Reveal delay={180}><GlobeView
              points={globeStatus}
              title="Globe 3 — Open now vs upcoming"
              subtitle="Green = open/rolling · Amber = opens soon · Grey = closed"
              legend={[
                { label: "Open now", color: "#10b981" },
                { label: "Rolling", color: "#6366f1" },
                { label: "Upcoming", color: "#f59e0b" },
                { label: "Closed", color: "#8b8fa3" },
              ]}
              onCountrySelect={(c) => runSearch({ destination: c })}
            /></Reveal>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {["Europe", "Asia", "Middle East", "Africa", "North America", "Oceania"].map((c) => {
              const count = destinationCounts.get(c) ?? 0;
              return (
                <button
                  key={c}
                  onClick={() => runSearch({ destination: c })}
                  className="rounded-full border border-border bg-secondary/60 px-4 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  {c} <span className="font-normal text-muted-foreground">({count})</span>
                </button>
              );
            })}
            <button
              onClick={() => runSearch({ destination: "all" })}
              className="rounded-full border border-primary/50 bg-primary/10 px-4 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/20"
            >
              Show the whole world
            </button>
          </div>
        </section>

        {/* ─── Open this season ─────────────────────────────────── */}
        <section id="open-now" className="scroll-mt-20 border-t border-border/70 py-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight sm:text-2xl">
                <span className="relative flex h-3 w-3">
                  <span className="ping-soft absolute inline-flex h-full w-full rounded-full bg-success" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
                </span>
                Open this season — {nowMonth}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {openNow.length} free-apply programs with windows open or rolling right now.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
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
            <p className="mt-4 text-xs text-muted-foreground">
              + {openNow.length - 8} more open programs — run a Deep Search to see them with your filters.
            </p>
          )}
        </section>

        {/* ─── Upcoming openings ────────────────────────────────── */}
        <section id="upcoming" className="scroll-mt-20 border-t border-border/70 py-12">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight sm:text-2xl">
              <CalendarRange className="h-6 w-6 text-warning" /> Upcoming openings
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Plan backwards from these dates — grouped by the month each window opens.
            </p>
          </div>

          {upcomingByMonth.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming windows found — everything is open or rolling.</p>
          ) : (
            <div className="space-y-8">
              {upcomingByMonth.map(([month, ops]) => (
                <div key={month}>
                  <div className="mb-3 flex items-center gap-3">
                    <h3 className="text-base font-bold text-warning">{month}</h3>
                    <div className="h-px flex-1 bg-border" />
                    <Badge variant="outline" className="text-[11px]">
                      {ops.length} window{ops.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
                    {ops.map((op) => (
                      <button
                        key={op.id}
                        onClick={() => runSearch({ destination: op.country === "Multiple EU countries" ? "Europe" : op.country })}
                        className="lift flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {flagEmoji(op.countryCode)} {op.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {op.country} · {op.levels.split(",").join(" / ")} · {op.feeConfirmedFree ? "$0 fee" : "fee applies"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="flex items-center gap-1 text-xs font-bold text-warning">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {op.cycle.nextOpen
                              ? new Date(op.cycle.nextOpen).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
                              : "TBA"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
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
        <section className="border-t border-border/70 py-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: <University className="h-5 w-5 text-primary" />,
                title: "Every program is hand-verified",
                body: "Free-apply status, English-waiver rules (MOI), transcript policies, recommendation counts and language requirements are curated per country — including exactly what Ghanaians, Nigerians, Kenyans and other nationalities need.",
              },
              {
                icon: <Globe2 className="h-5 w-5 text-warning" />,
                title: "3 live globes, 1 click away",
                body: "Universities, scholarships and seasonal openings mapped on realistic 3D earths by continent and country. Click a country badge to pull its programs instantly.",
              },
              {
                icon: <Handshake className="h-5 w-5 text-fuchsia-500" />,
                title: "Co-Pilot + deep web in one pass",
                body: "Four crafted live web queries run in parallel with the curated database — then the Apply Co-Pilot turns any result into a guided application with documents, answers and emails.",
              },
            ].map((f) => (
              <Reveal key={f.title} className="h-full">
                <div className="lift h-full rounded-2xl border border-border bg-card p-5">
                  {f.icon}
                  <h3 className="mt-3 text-sm font-bold text-foreground">{f.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      </main>

      {/* ─── Footer ─────────────────────────────────────────────── */}
      <footer className="mt-auto border-t border-border/70 bg-secondary/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <p>
              <span className="font-bold text-foreground">ScholarGlobe</span> — free-application scholarships &amp;
              universities worldwide. Data is curated for research purposes; always verify details on the official
              program pages before paying anything. The co-pilot prepares — every official submission is made by you.
            </p>
            <p className="font-medium">Never pay an agent for a $0 application.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
