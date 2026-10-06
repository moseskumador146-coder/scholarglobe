/**
 * Stable slugs for the original 55 seed entries (keyed by exact name),
 * plus a relation patch that links universities ↔ scholarships.
 * Relations are made bidirectional automatically inside scripts/seed.ts.
 */

export const EXISTING_SLUGS: Record<string, string> = {
  // ── Europe 1 ──
  "Chevening Scholarships": "chevening",
  "Commonwealth Master's Scholarships": "commonwealth-masters",
  "Commonwealth Shared Scholarships": "commonwealth-shared",
  "Gates Cambridge Scholarship": "gates-cambridge",
  "Rhodes Scholarship — West Africa (incl. Ghana)": "rhodes-west-africa",
  "UK Funded PhD Projects (advertised studentships)": "uk-funded-phd",
  "DAAD EPOS — Development-Related Postgraduate Courses": "daad-epos",
  "Deutschlandstipendium": "deutschlandstipendium",
  "RWTH Aachen University — Free Direct Application": "rwth-aachen",
  "FAU Erlangen-Nürnberg — Free Direct Application": "fau-erlangen",
  "Saarland University — Free Direct Application": "saarland-university",
  "TU Chemnitz — Free Direct Application": "tu-chemnitz",
  "University of Passau — Free Direct Application": "university-passau",
  // ── Europe 2 ──
  "Stipendium Hungaricum Scholarship": "stipendium-hungaricum",
  "Türkiye Bursları (Türkiye Scholarships)": "turkiye-burslari",
  "Erasmus Mundus Joint Masters (EMJM) Scholarships": "erasmus-mundus",
  "Eiffel Excellence Scholarship Programme": "eiffel",
  "Ampère Excellence Scholarships (ENS Lyon)": "ampere-ens-lyon",
  "Swiss Government Excellence Scholarships": "swiss-excellence",
  "VLIR-UOS Scholarships (ICP Connect)": "vlir-uos",
  "Government of Ireland International Education Scholarship (GOI-IES)": "goi-ies",
  "Swedish Institute Scholarships for Global Professionals (SISGP)": "sisgp",
  "Invest Your Talent in Italy": "invest-your-talent",
  "Open Doors Russian Scholarship Olympiad": "open-doors",
  "Heinrich Böll Foundation Scholarships": "heinrich-boll",
  "Ghent University BOF Doctoral Scholarships": "ghent-bof",
  // ── Asia / Middle East ──
  "Singapore International Graduate Award (SINGA)": "singa",
  "Global Korea Scholarship (GKS) — Graduate": "gks",
  "MEXT Japanese Government Scholarship (Embassy Recommendation)": "mext",
  "Chinese Government Scholarship (CSC) — Embassy Track": "csc",
  "Schwarzman Scholars Program": "schwarzman",
  "Yenching Academy Fellowship (Peking University)": "yenching",
  "KAUST Fellowship (King Abdullah University)": "kaust-fellowship",
  "Khalifa University Graduate Scholarships": "khalifa-university",
  "Islamic Development Bank Scholarships (IsDB)": "isdb",
  "Hong Kong PhD Fellowship Scheme (HKPFS)": "hkpfs",
  "ICCR Scholarships (Indian Council for Cultural Relations)": "iccr",
  // ── Americas / Africa / Oceania ──
  "Fulbright Foreign Student Program (Ghana)": "fulbright-ghana",
  "Joint Japan/World Bank Graduate Scholarship (JJ/WBGSP)": "jjwbgsp",
  "Rotary Peace Fellowship": "rotary-peace",
  "Lester B. Pearson International Scholarships (U of Toronto)": "pearson-toronto",
  "Vanier Canada Graduate Scholarships": "vanier",
  "Smith College — $0 Application + Full Need Aid": "smith-college",
  "Wellesley College — $0 Application + Full Need Aid": "wellesley-college",
  "Bowdoin College — $0 Application + Full Need Aid": "bowdoin-college",
  "Carleton College — $0 Application + Generous Aid": "carleton-college",
  "Colby College — $0 Application + Full Need Aid": "colby-college",
  "Reed College — $0 Application + Need-Based Aid": "reed-college",
  "US PhD Programs with Application Fee Waivers (STEM pattern)": "us-phd-fee-waivers",
  "Australia Awards Scholarships (Africa incl. Ghana)": "australia-awards",
  "Manaaki New Zealand Scholarships": "manaaki-nz",
  "AIMS Structured Masters (incl. Ghana campus)": "aims-masters",
  "Pan African University (PAU) Scholarships": "pan-african-university",
  "Ashesi University — Mastercard Foundation Scholars": "ashesi-mcf",
  "Ghana Scholarships Secretariat — Local & Foreign Awards": "ghana-secretariat",
};

/**
 * Extra university↔scholarship relations for the ORIGINAL entries
 * (new entries carry their relations inline in their seed files).
 * Keyed by slug → related slugs. Made bidirectional by seed.ts.
 */
export const RELATED_PATCH: Record<string, string[]> = {
  // German universities participate in Deutschlandstipendium + Böll foundation funding
  "rwth-aachen": ["deutschlandstipendium", "heinrich-boll"],
  "fau-erlangen": ["deutschlandstipendium", "heinrich-boll"],
  "saarland-university": ["deutschlandstipendium", "heinrich-boll"],
  "tu-chemnitz": ["deutschlandstipendium", "heinrich-boll"],
  "university-passau": ["deutschlandstipendium", "heinrich-boll"],
  // Erasmus Mundus consortia host at these European universities
  "erasmus-mundus": ["tum", "university-helsinki", "ku-leuven", "sapienza-rome", "grenoble-alpes"],
  // Swiss Excellence research fellowships host at EPFL
  "swiss-excellence": ["epfl"],
  // Stipendium Hungaricum partner university
  "stipendium-hungaricum": ["elte-budapest"],
  // SINGA is a PhD award at NUS & NTU
  singa: ["nus-singapore", "ntu-singapore"],
  // VLIR-UOS ICP Connect programmes run at Flemish universities
  "vlir-uos": ["ku-leuven"],
  // US-wide mechanisms
  "fulbright-ghana": ["mit-phd"],
  "us-phd-fee-waivers": ["mit-phd"],
  "ghana-secretariat": ["ashesi-mcf"],
};
