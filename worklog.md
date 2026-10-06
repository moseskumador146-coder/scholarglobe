---
Task ID: 1
Agent: Super Z (main agent)
Task: Build ScholarGlobe — a scholarship & university search platform with deep web search, 3 interactive globes, nationality-based filtering (Ghana-first), free-application verification, and open/upcoming season tracking.

Work Log:
- Initialized fullstack environment (Next.js 16 + TS + Tailwind 4 + shadcn/ui + Prisma/SQLite)
- Installed react-globe.gl + three; downloaded earth-dark/night/blue-marble textures to public/globe/
- Designed Prisma Opportunity schema (fee verification, MOI/English waiver, local language, recommendations, unofficial transcripts, recurring application cycle windows) and pushed DB
- Curated & seeded 55 real opportunities across 6 continents (scripts/seed.ts + 4 seed data files): Chevening, Commonwealth, DAAD EPOS, Erasmus Mundus, MEXT, GKS, CSC, Schwarzman, SINGA, KAUST, Stipendium Hungaricum, Türkiye Bursları, VLIR-UOS, SISGP, Eiffel, Open Doors Russia, AIMS, PAU, Mastercard/Ashesi, Australia Awards, US $0-fee colleges, RWTH/FAU/Saarland/TU Chemnitz/Passau free-apply universities, etc. Each record has step-by-step how-to-apply guides, fee notes, Ghana MOI-waiver notes, competitiveness data, insider tips
- Built API routes: /api/opportunities (filter by destination/level/field/freeOnly/moiOnly/status/q, computes recurring OPEN/UPCOMING/ROLLING/CLOSED status), /api/globe?type=universities|scholarships|status (per-country aggregated points), /api/deep-search (z-ai-web-dev-sdk web_search, 3 crafted queries, in-memory 30min cache, backend only), /api/stats
- Built frontend: dark premium theme (slate-950 + emerald/amber), hero with origin-country search panel + example chips ("Ghanaian → full scholarships in Europe, Master's, English-waived"), curated vs deep-web result tabs, rich result cards with "How to apply" dialog (numbered steps, fee/funding/language/documents/eligibility/tips sections), 3 react-globe.gl globes (universities, scholarships, open-now vs upcoming) with country point clicks + continent chips, "Open this season — October 2026" with countdown badges, "Upcoming openings" grouped by month, sticky footer, fully responsive
- Lint clean; browser-verified end-to-end with agent-browser: hero renders, example search returns 20 curated + 13 deep web results, dialog works, 3 globes render with WebGL points, chips filter results (49 worldwide), season/upcoming sections render, mobile viewport OK, footer OK
- Fixed 1 runtime bug found by browser verification: cycle was JSON-stringified in API response (frontend expected object)

Stage Summary:
- Deliverable: runnable Next.js app on port 3000 (single / route), dev.log clean, no browser console errors
- Data: 55 opportunities, 49 confirmed $0-fee, 52 MOI/English-waiver friendly, 15 universities + 40 scholarships, 21 open/rolling this season (Oct 2026), 17 upcoming windows grouped Nov 2026 → 2027
- Key files: prisma/schema.prisma, src/lib/seed-*.ts, src/lib/opportunity-status.ts, src/app/api/{opportunities,globe,deep-search,stats}/route.ts, src/components/{globe-view,opportunity-card}.tsx, src/app/page.tsx, scripts/seed.ts

---
Task ID: 2
Agent: Super Z (main agent)
Task: Enhance ScholarGlobe per user follow-up: (1) link universities ↔ scholarships, (2) deeper search, (3) university applications below $30 or local-currency equivalent, (4) show related scholarships so students know they have "both done".

Work Log:
- Extended Prisma Opportunity schema: slug (unique, stable link key), relatedSlugs (CSV uni↔scholarship links), feeUsdApprox (USD equivalent for the ≤$30 filter); pushed DB (force-reset) and re-seeded
- Added 34 NEW curated entries → database now 89 opportunities (44 universities + 45 scholarships) across 6 continents: 29 new ≤$30 universities (TUM, Oslo, NTNU, Helsinki, Aalto, EPFL CHF 10, CTU/Masaryk CZK 500, Warsaw/Jagiellonian PLN 85-100, Camerino/Sapienza/KU Leuven €0, Iceland, Grenoble Mon Master, Berea, MIT PhD $0, USP, UBA, NUS S$20, NTU S$10, UM RM 100, USM RM 50, Madinah full-scholarship, UJ R0, Wits/UCT/Stellenbosch R100-300, ELTE via Stipendium) + 5 new scholarships (Helsinki 100% waiver, Mastercard Foundation, Common App/NACAC fee waiver, MIS Malaysia, MTCP)
- Built slug map + bidirectional relation patch (47 linked entries): RWTH/FAU/Saarland/Chemnitz/Passau ↔ Deutschlandstipendium + Böll; Erasmus Mundus ↔ TUM/Helsinki/KU Leuven/Sapienza/Grenoble; Swiss Excellence ↔ EPFL; Stipendium ↔ ELTE; SINGA ↔ NUS/NTU; VLIR ↔ KU Leuven; Fulbright/US-PhD-waivers ↔ MIT; Common App waiver ↔ 7 US colleges; MIS/MTCP ↔ UM/USM; MCF ↔ Ashesi; Helsinki Scholarship ↔ Helsinki/Aalto
- /api/opportunities upgraded: fee=free|low(≤$30)|all filter, kind filter, related links resolved from full table, university↔scholarship PAIRS computation (both sides must pass filters, combined fee + bothOpen), matchScore ranking — verified 40 pairs for Ghana/masters, 33 $0-both
- /api/stats upgraded: freeUnis, lowFeeUnis (44), linked (47), openNow (35)
- /api/deep-search deepened: 4 crafted queries (adds ≤$30 fee hunt + MOI/WAEC waiver hunt), fee/free keyword tagging on every result, AI briefing via chat.completions (fails soft) — verified live synthesis for Ghana→Europe
- UI: fee Select ($0-only / ≤$30-or-local / any), 🤝 "Apply to both (N)" results tab with PairCard (uni+scholarship cards side by side, combined cost badge, 2-checkbox checklist persisted in localStorage, "Both done!" state), related chips on every card ("Fund it with" / "Apply at" with status dots + fees), related section inside apply dialogs, ≤$30 "Under $30" teal badges, hero stats line (71 $0-fee · 44 unis ≤$30 · 47 links), third example chip, web-tab AI briefing + fee tags
- Fixed 2 bugs found via browser verification: continent chips showed (0) (counted by country instead of continent) and mobile horizontal overflow 608→390px (grid min-width:auto on upcoming buttons + card grids; added min-w-0, whitespace-normal badge)
- Lint clean; agent-browser verified end-to-end: search 83 curated + 40 pairs + 10 web results, pairs tab renders with checklists, dialog related sections (RWTH), AI briefing visible, continent chips fixed counts, mobile 390px no overflow, no console errors

Stage Summary:
- Deliverable: runnable Next.js app on port 3000 (single / route); server is (re)started by platform boot script (note: sandbox kills agent-spawned servers between tool calls — verification was done in single-call runs; platform restarts dev server at session boot)
- Data: 89 opportunities (44 unis ALL ≤$30 to apply, 45 scholarships), 47 uni↔scholarship links, 40 filterable pairs
- Key files: prisma/schema.prisma, src/lib/seed-{unis-europe-1,unis-europe-2,unis-world-1,unis-world-2,extra-scholarships,links}.ts, scripts/seed.ts, src/app/api/{opportunities,stats,deep-search}/route.ts, src/components/{opportunity-card,pair-card}.tsx, src/app/page.tsx

---
Task ID: 3
Agent: Super Z (main agent)
Task: (a) Build full Apply Co-Pilot (50-50 apply-together: doc vault, wizard, kits, email autopilot with BOTH email types + chooser); (b) UI overhaul — vibrant light/dark themes, animations, mobile-first fixes; (c) hyper-realistic 3D globes; (d) triple-check everything.

Work Log:
- Design system rebuilt: oklch token palettes (light: white+indigo glow / dark: rich navy #0d1126+glowing indigo-violet-fuchsia), .text-gradient(-animated), reveal-on-scroll, floating orbs, lift/glow/shimmer/ping animations, themed scrollbar, prefers-reduced-motion respected; next-themes ThemeProvider + animated ThemeToggle (dark default)
- Apply Co-Pilot data layer (src/lib/copilot-store.ts): localStorage (profile/apps/prefs, hydration-safe mount-then-load via useSyncExternalStore) + IndexedDB vault for file Blobs (15MB cap); requiredDocs(op) derives each programme's REAL doc checklist (unofficial-transcript policy, MOI cert vs IELTS, referee counts, fee-waiver evidence); wizardQuestions(op) generates paste-ready answer prompts; per-app snapshots of reqDocs/wizardQs stored at add time
- Email Autopilot (src/lib/email-templates.ts): 7 templates in student's voice (referee request, fee waiver, MOI/English waiver, missing-doc question, status follow-up, transcript request, deferral) + 4 send routes: mailto: (own mail app), Gmail compose, Outlook compose, copy-to-clipboard; EmailSendDialog asks which one EVERY time (last choice pre-selected + remember switch) — user always presses final send
- New API /api/essay: AI motivation-letter + portal-answer drafting via z-ai-web-dev-sdk chat.completions (cached 30min, fails soft)
- Co-pilot UI (5 tabs): Overview (stat cards, next-deadline countdowns, 50-50 explainer), Documents (drag&drop vault, per-app coverage bars), Wizard (profile interview 0-100% + per-app answers with AI draft + copy), Kits (status stepper planned→decision, doc checklist from real rules, deadline badges, AI motivation letter per app, notes, one-tap waiver/MOI/follow-up emails), Emails (7 kinds + live preview); every OpportunityCard & PairCard got "＋ Co-Pilot" add buttons (deduped)
- Realistic globes: earth-blue-marble (light) / earth-night city lights (dark) + earth-topology bump relief + earth-water specular ocean shimmer + night-sky 4096px starfield + atmosphere; 3 marker layers (glowing columns, pulsing sonar rings, always-visible flag+count country badges clickable to filter)
- Page rebuilt mobile-first: glass header + mobile menu, 44px touch targets, h-11 selects, fixed prior horizontal-overflow class of bugs, semantic-token classes everywhere
- Triple check: tsc clean; eslint clean; APIs verified (stats 89/71/44/45/47/35, Ghana→Europe 32 results+25 pairs, /api/essay live draft); agent-browser e2e on desktop 1440px + mobile 390px, both themes, full flow (search → add 2 apps → upload 2 docs → coverage 1/8+1/7 → profile fill → kit checklist → email chooser dialog), localStorage+IndexedDB persistence after reload, dev-issue overlay CLEAN, no console errors, no mobile overflow
- Fixed 2 bugs found by verification: (1) hydration mismatch — copilot store read localStorage during first client render ("Kits 2" vs SSR "Kits"); switched to mount-then-load; (2) fee-waiver button condition referenced non-existent field on app snapshot

Stage Summary:
- Deliverable: runnable Next.js app on port 3000 (single / route), dev.log clean of app errors (only external 429s during testing, fail-soft), lint+types clean, zero hydration warnings
- Data: 89 opportunities (44 unis all ≤$30 · 45 scholarships · 71 $0-fee · 47 uni↔scholarship links), now with per-application co-pilot kits
- Privacy: all co-pilot data (profile, answers, docs) stays in browser localStorage/IndexedDB; nothing uploaded; no passwords stored (emails sent from user's own accounts)
- Key new files: src/lib/{copilot-store,email-templates}.ts, src/app/api/essay/route.ts, src/components/{theme-provider,theme-toggle,reveal}.tsx, src/components/copilot/{apply-copilot,document-vault,application-wizard,submission-kits,email-center,email-send-dialog}.tsx, public/globe/{earth-topology,earth-water,night-sky}.*

---
Task ID: 4
Agent: Super Z (main agent)
Task: (a) Fix Co-Pilot "does not work at all" — full diagnosis + repair + sync; (b) fix stale/wrong site data; (c) fix slow page/globe loads + use light globe in both themes; (d) add free online degrees / professional certificates with a dedicated page; (e) triple-check everything.

Work Log:
- Browser-diagnosed the Co-Pilot end-to-end; found and fixed 4 real bugs:
  (1) ApplicationWizard activeSlug initialized from empty pre-load apps → answers panel permanently stuck empty ("copilot doesn't work"); now auto-selects as apps load (useEffect re-sync).
  (2) SubmissionKits expanded had the same stale-init bug; now auto-expands first kit on load.
  (3) Wizard AI answer mapping discarded CAREER_PLAN and STRENGTHS blocks (no-op line); now maps whyThis/careerGoal/financialNeed properly.
  (4) EmailSendDialog gmail/outlook window.open silently fails when popups blocked; added synthetic-anchor fallback so compose always opens.
- Docs↔Kits sync (user ask "all docs and email work in syn"): kit checklist now auto-ticks when a matching doc type exists in the vault ("· in vault ✓" + disabled checkbox + "N docs in vault" badge), progress auto-computes, "Documents complete — mark Ready to submit" prompt auto-appears → sets status ready; Documents tab coverage bars unchanged (verified live: upload transcript+CV → 1/8→2/8 → kit auto-updates).
- Copilot doc engine now adapts to ONLINE kinds: CERTIFICATE → 2-doc checklist (ID + optional study proof); ONLINE_DEGREE → no photo/CV, degree cert only for masters/phd.
- Stale/wrong site data: wrote scripts/check-urls.mjs (HTTP-verified all 89 official URLs) + 2 web-search rounds (scripts/find-urls*.mjs) → fixed 26 URLs in seed files (GKS, Wits, UCT, Sapienza, NTNU, Saarland, Grenoble, Helsinki scholarship, Khalifa, UM, Iceland, Camerino, Berea, Bowdoin, Deutschlandstipendium, Ghent BOF, GOI-IES, ENS Lyon Ampère, AIMS, Open Doors → od.globaluni.ru, PAU → pau-au.africa, KU Leuven, Stellenbosch, USP, Swiss Excellence, Commonwealth CSC) → re-seeded; 403s/fetch-failures from sandbox verified as bot-protection false positives (kept correct URLs).
- NEW Online & Certificates: seed-online.ts with 23 verified entries (4 tuition-free online degrees: UoPeople, IOU Gambia, IGNOU, UVS Senegal; 19 free-certificate providers: Google Digital Skills Africa, ALX, FAO eLearning, SAP Learning, Elements of AI, Cisco NetAcad, IBM SkillsBuild, Microsoft Learn+Training Days free exam vouchers, AWS Educate, Coursera Financial Aid, edX audit+90% aid, HP LIFE, Kaggle, Alison, OpenLearn, Stanford free, MIT OCW, Grow with Google, UN SDG:Learn) — every URL curl-verified; kinds ONLINE_DEGREE/CERTIFICATE + "certificate" level added to schema/types.
- /online dedicated page: own hero+stats, level/field/keyword/no-English-test filters (instant client filtering), AI deep search with mode:"online" (4 retooled live queries + online-learning AI briefing — verified live), OpportunityCards with Co-Pilot support, nav link + hero chip link from home.
- /api/opportunities: kind=ONLINE filter (kind IN [ONLINE_DEGREE, CERTIFICATE]); /api/stats: online count; /api/deep-search: online mode with dedicated queries + briefing prompt.
- Globe perf + realism: USER REQUEST — photoreal blue-marble texture now used in BOTH themes (dark mode no longer uses night texture); textures compressed 3.9MB→619KB (blue-marble 2560px q72, topology/water/night-sky → 2048 jpg; removed earth-night/earth-dark); rendererConfig antialias+high-performance; labelled "Loading realistic globe…" spinner; markers enlarged (13px, 2px border, brighter glow, theme-scaled) + taller columns + faster rings.
- Triple check (3 rounds): lint clean, tsc 0 src errors; browser e2e desktop 1280 dark + mobile 390 light: add 2 campus apps + 1 certificate app via cards, upload transcript+CV (coverage 2/8+2/7), kit auto-expand + in-vault ✓ + Ready-prompt → status ready, wizard questions render + profile fill + prefill (3 answers persist), email chooser: copy mode ✓ (clipboard), gmail mode ✓ (verified real navigation to accounts.google.com with fully pre-filled draft incl. profile data), referee email correctly disabled without referees, AI essay 2071 chars saved, overview deadlines countdown ✓, pairs tab 28 pairs ✓, /online filters 19 certificates ✓ + deep web 6 results + AI briefing ✓; mobile 390px no horizontal overflow on / and /online; zero console errors on fresh loads; zero page errors; dev.log clean except external 429s (fail-soft); globe canvases render <1s after scroll (was the complaint), home DCL 610ms / load 1.1s, pages 200 OK <100ms.
- Note: transient HMR "Parsing ecmascript source code failed" console entries seen mid-session were stale artifacts of in-flight edits (final fresh loads show 0 errors, tsc/lint clean).

Stage Summary:
- Deliverable: runnable Next.js app (port 3000) with / and /online routes; lint+types clean; no console errors; platform restarts dev server at session boot.
- Data: 112 opportunities — 44 universities (all ≤$30, 32 $0), 45 scholarships, 23 free online offerings (94 total $0-fee, 96 MOI-friendly, 47 uni↔scholarship links, 58 open/rolling); 26 stale URLs corrected with HTTP-verified replacements.
- Co-Pilot: fully functional verified flow — add→vault upload→auto-checklist sync→Ready prompt→status stepper→wizard answers→AI essay→email chooser (4 modes, remembered preference); docs stay in localStorage/IndexedDB.
- Key files: src/lib/seed-online.ts (new), src/app/online/page.tsx (new), scripts/check-urls.mjs + find-urls-2.mjs + compress-globe.py (new), src/components/copilot/{application-wizard,submission-kits,email-send-dialog}.tsx, src/lib/copilot-store.ts, src/components/globe-view.tsx, src/app/page.tsx, src/app/api/{opportunities,stats,deep-search}/route.ts, public/globe/* (compressed).

---
Task ID: 5
Agent: Super Z (main agent)
Task: (a) Complete the Co-Pilot Browser (user: "copilot work is 30%... launch a fully functional browser with tabs, history... read the screen, navigate, auto-fill from uploaded documents, only prompt for confirm/CAPTCHA"); (b) deep-search trusted certificates for software engineering, communications, aviation (airports, air hostess, cabin crew) from universities/accredited institutions; (c) triple-check everything.

Work Log:
- Audited the interrupted session's work: copilot-browser.tsx (1238 lines), /api/browse proxy (332 lines), /api/browse-assist AI (127 lines), /public/copilot-inject.js all present and wired into opportunity-card, submission-kits and apply-copilot — verified architecture: same-origin proxy (SSRF-guarded, per-tab cookie jars, HTML/CSS rewrite, CSP/XFO stripped, inject script for SPA-nav/new-tab interception), screen reader via contentDocument (fields, labels, selects, captcha/file/password/payment detection), instant-fill bank (17 profile keys with label-regex matching), AI smart-map + AI guide via /api/browse-assist (10-min cache, fail-soft), tabs/history/bookmarks persisted in localStorage.
- Found the NEW certificates seed file (seed-certs.ts, 15 entries) was written but NEVER imported into the DB → ran scripts/seed.ts (upsert) → DB now 127 opportunities (34 CERTIFICATE incl. Harvard CS50x, freeCodeCamp, Odin Project, IATA Cabin Crew — air hostess, IATA Airport Operations, ISC2 CC cybersecurity, MITx MicroMasters, UMich Python, Meta Back-End, Google IT Automation/Digital Marketing/PM, Illinois Digital Marketing, WBG Open Learning, + 19 seed-online certs; 4 ONLINE_DEGREE; 44 unis; 45 scholarships). Stats API: 127 total / 105 free / 38 online.
- FIXED 5 bugs found by triple-checking:
  (1) copilot-store.ts: setBrowserHistory/setBrowserBookmarks used before declaration (react-hooks/immutability lint error) → moved useState declarations above the sync effect.
  (2) copilot-browser.tsx TS18047 'active' possibly null in panel render → guarded {active && activeRead && (...)}.
  (3) copilot-browser.tsx unused eslint-disable directive → removed.
  (4) /api/opportunities field filter let every record tagged "any" pass ANY field filter → filter now exact-matches the selected field (software engineering: 6, aviation & hospitality: 2, communications & media: 4, cybersecurity: 1 — all precise).
  (5) fullName fill regex contained a broken alternative ($^applicant) and missed "Customer name"/"Applicant name" → fixed to /full[\s_-]?name|^name\b(?!\s+(of|your|and|the)\b)|applicant|candidate|customer|student[\s_-]?name/i with false-positive guards for "Name of university"/"Name your referee".
  (6) a11y: Co-Pilot Browser DialogContent lacked DialogTitle (console error) → added sr-only DialogTitle.
- E2E verified with agent-browser (desktop 1280 + mobile 390, light+dark):
  • home loads, example search 37 curated + 28 pairs tabs;
  • Co-Pilot Browser opens from OpportunityCard "Open in Co-Pilot Browser" → iframe loads real external page (Commonwealth Master's Scholarships via cscuk.fcdo.gov.uk) same-origin through proxy;
  • screen read detected 12 fields on httpbin.org/forms/post; Instant fill wrote phone +233 24 123 4567 and email kwame.mensah@example.com into the live form; AI smart map filled "Customer name" → "Kwame Mensah" (profile from localStorage);
  • tabs: new-tab button, 3 tabs live; history persisted (sg-copilot-history), tab session restore (sg-copilot-browser-tabs); graceful proxy error page (Wikimedia 403 rendered as friendly error card with "open directly" escape);
  • full kit journey: add app via card → Co-Pilot section → Kits tab → auto-expand → "Open portal in Co-Pilot Browser" → browser opens with 🎯 app context and loads the official portal;
  • /api/browse-assist guide mode returns concrete "Do now / Needs you" guidance (verified live);
  • /online: cabin-crew/air-hostess, airports, software-engineering chips present; field filters now precise; 3 globe canvases render on mobile 390px; no horizontal overflow; console CLEAN after DialogTitle fix (fresh load), tsc 0 src errors, eslint clean; dev.log clean.

Stage Summary:
- Deliverable: runnable Next.js app (port 3000), / and /online; Co-Pilot Browser fully functional (tabs/history/bookmarks, screen reading, instant+AI autofill, docs panel with download-to-upload, needs-you alerts for CAPTCHA/uploads/passwords/payments, per-tab login cookies, graceful failure for blocking sites); 127 curated opportunities incl. 34 trusted certificates (Harvard/MIT/UMich/Illinois/IATA/ISC2/Google/Meta/IBM/Cisco/Microsoft/AWS/World Bank).
- Key files changed: src/lib/copilot-store.ts, src/components/copilot/browser/copilot-browser.tsx, src/app/api/opportunities/route.ts, db/custom.db (re-seeded 127).
- Honest limits (by design): file uploads require the user to pick files (browser security), passwords/CAPTCHA/payments always need the user, sites with hard bot-protection show a friendly error page with a direct-escape link.
