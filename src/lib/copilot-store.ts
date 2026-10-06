"use client";

/**
 * ScholarGlobe Apply Co-Pilot — browser-local data layer.
 *
 * Everything lives on the user's device:
 *  - Profile + applications + preferences → localStorage
 *  - Document files (PDFs, scans, photos)  → IndexedDB as Blobs
 * Nothing is ever uploaded to a server.
 */

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// ── Types ────────────────────────────────────────────────────────────

export type DocType =
  | "passport"
  | "photo"
  | "transcript"
  | "degree"
  | "englishTest"
  | "moiCertificate"
  | "cv"
  | "sop"
  | "recommendation"
  | "feeWaiverEvidence"
  | "other";

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  passport: "Passport / national ID",
  photo: "Passport photo",
  transcript: "Academic transcript",
  degree: "Degree certificate / diploma",
  englishTest: "English test (IELTS/TOEFL/…)",
  moiCertificate: "Medium-of-Instruction certificate",
  cv: "CV / résumé",
  sop: "Motivation letter / essay",
  recommendation: "Recommendation letter",
  feeWaiverEvidence: "Fee-waiver evidence (income letter…)",
  other: "Other document",
};

export const DOC_TYPE_ICON: Record<DocType, string> = {
  passport: "🛂",
  photo: "📷",
  transcript: "📑",
  degree: "🎓",
  englishTest: "🗣️",
  moiCertificate: "🏫",
  cv: "📋",
  sop: "✍️",
  recommendation: "📨",
  feeWaiverEvidence: "💳",
  other: "📎",
};

export interface Referee {
  name: string;
  title: string;
  institution: string;
  email: string;
  relation: string;
}

export interface CopilotProfile {
  fullName: string;
  email: string;
  phone: string;
  nationality: string;
  dob: string;
  address: string;
  highestDegree: string;
  degreeInstitution: string;
  degreeCountry: string;
  graduationYear: string;
  gpa: string;
  field: string;
  targetLevels: string;
  careerGoal: string;
  achievements: string;
  englishStatus: "moi" | "test" | "planned" | "none";
  englishTestDetails: string;
  referees: Referee[];
  updatedAt: string;
}

export const EMPTY_PROFILE: CopilotProfile = {
  fullName: "",
  email: "",
  phone: "",
  nationality: "",
  dob: "",
  address: "",
  highestDegree: "",
  degreeInstitution: "",
  degreeCountry: "",
  graduationYear: "",
  gpa: "",
  field: "",
  targetLevels: "",
  careerGoal: "",
  achievements: "",
  englishStatus: "none",
  englishTestDetails: "",
  referees: [],
  updatedAt: "",
};

export type AppStatus = "planned" | "gathering" | "ready" | "submitted" | "decision";
export type AppDecision = "none" | "accepted" | "rejected" | "waitlist";

export const STATUS_META: Record<AppStatus, { label: string; icon: string; color: string }> = {
  planned: { label: "Planned", icon: "🎯", color: "var(--chart-1)" },
  gathering: { label: "Gathering docs", icon: "📂", color: "var(--warning)" },
  ready: { label: "Ready to submit", icon: "✅", color: "var(--chart-2)" },
  submitted: { label: "Submitted", icon: "📮", color: "var(--chart-4)" },
  decision: { label: "Decision", icon: "🏁", color: "var(--chart-5)" },
};

export interface CopilotApplication {
  id: string;
  slug: string;
  name: string;
  kind: string;
  provider: string;
  country: string;
  countryCode: string;
  officialUrl: string;
  deadlineIso: string | null;
  deadlineNote: string;
  feeLabel: string;
  status: AppStatus;
  decision: AppDecision;
  addedAt: string;
  submittedAt: string | null;
  notes: string;
  answers: Record<string, string>;
  essayDraft: string;
  checklist: Record<string, boolean>;
  /** Snapshot of this opportunity's document requirements (computed at add time) */
  reqDocs: ReqDoc[];
  /** Snapshot of wizard questions (computed at add time) */
  wizardQs: WizardQuestion[];
  /** Extra context for AI drafting / emails */
  levels: string;
  fields: string;
  fundingNote: string;
  essayNote: string;
  moiAccepted: boolean;
}

export type EmailMode = "ask" | "mailapp" | "gmail" | "outlook" | "copy";

export interface CopilotPrefs {
  emailMode: EmailMode;
}

// ── Co-Pilot Browser: history & bookmarks (localStorage) ─────────────

const HISTORY_KEY = "sg-copilot-history";
const BOOKMARKS_KEY = "sg-copilot-bookmarks";

export interface BrowserHistoryItem {
  url: string;
  title: string;
  at: string;
}

export interface BrowserBookmark {
  id: string;
  url: string;
  title: string;
  addedAt: string;
}

export function readBrowserHistory(): BrowserHistoryItem[] {
  return readLS<BrowserHistoryItem[]>(HISTORY_KEY, []).slice(0, 200);
}

export function writeBrowserHistory(items: BrowserHistoryItem[]) {
  writeLS(HISTORY_KEY, items.slice(0, 200));
}

export function readBrowserBookmarks(): BrowserBookmark[] {
  return readLS<BrowserBookmark[]>(BOOKMARKS_KEY, []);
}

export function writeBrowserBookmarks(items: BrowserBookmark[]) {
  writeLS(BOOKMARKS_KEY, items);
}

// ── localStorage state ───────────────────────────────────────────────

const PROFILE_KEY = "sg-copilot-profile";
const APPS_KEY = "sg-copilot-apps";
const PREFS_KEY = "sg-copilot-prefs";

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full / private mode — data stays in memory for the session */
  }
}

// ── IndexedDB document vault ─────────────────────────────────────────

const DB_NAME = "sg-copilot";
const DB_STORE = "docs";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) return resolve(null);
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE, { keyPath: "id" });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(rec: { id: string; meta: DocMeta; file: Blob }): Promise<boolean> {
  const db = await openDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(rec);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

async function idbGet(id: string): Promise<{ id: string; meta: DocMeta; file: Blob } | null> {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbDelete(id: string): Promise<void> {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).delete(id);
  } catch {
    /* ignore */
  }
}

// ── Document metadata ────────────────────────────────────────────────

export interface DocMeta {
  id: string;
  type: DocType;
  label: string;
  mime: string;
  size: number;
  addedAt: string;
  note: string;
}

// ── Required-documents engine ────────────────────────────────────────

export interface ReqDoc {
  type: DocType;
  label: string;
  note: string;
}

export interface MinimalOp {
  id: string;
  slug: string;
  name: string;
  kind: string;
  provider: string;
  country: string;
  countryCode: string;
  officialUrl: string;
  feeConfirmedFree: boolean;
  feeAmount: number;
  feeCurrency: string;
  feeUsd: number;
  recommendationsRequired: boolean;
  recommendationsCount: number | null;
  recommendationsNote: string | null;
  unofficialTranscripts: boolean;
  transcriptsNote: string | null;
  essayRequired: boolean;
  essayNote: string | null;
  moiAccepted: boolean;
  moiNote: string | null;
  englishTests: string | null;
  localLanguageRequired: boolean;
  localLanguageNote: string | null;
  cycle: { status: string; nextOpen?: string; nextClose?: string; label: string };
}

/** Derive the full document checklist a given opportunity needs. */
export function requiredDocs(op: MinimalOp): ReqDoc[] {
  const isCert = op.kind === "CERTIFICATE";

  // Free professional certificates need almost nothing — that's their point.
  if (isCert) {
    return [
      { type: "passport", label: "ID / passport scan", note: "Some platforms verify identity for certificates — have a scan handy." },
      {
        type: "transcript",
        label: "Prior study proof (optional)",
        note: "Usually NOT needed — most free certificate platforms only need an email account.",
      },
    ];
  }

  const isOnline = op.kind === "ONLINE_DEGREE";

  const docs: ReqDoc[] = [
    { type: "passport", label: "Passport / national ID", note: isOnline ? "Scan usually enough to enroll — original needed for on-site exams." : "Valid at least 6 months beyond enrollment." },
    ...(isOnline
      ? []
      : [{ type: "photo" as DocType, label: "Passport-style photo", note: "White background, recent (< 6 months)." }]),
    {
      type: "transcript",
      label: op.unofficialTranscripts ? "Transcript (unofficial OK)" : "Official transcript",
      note: op.unofficialTranscripts
        ? op.transcriptsNote ?? "Scanned copy accepted at application stage."
        : op.transcriptsNote ?? "Certified / officially issued copy required.",
    },
    ...(((op as { levels?: string }).levels ?? "").includes("masters") ||
    ((op as { levels?: string }).levels ?? "").includes("phd")
      ? [{ type: "degree" as DocType, label: "Degree certificate", note: "Or expected-graduation letter if still studying." }]
      : []),
    ...(isOnline
      ? []
      : [{ type: "cv" as DocType, label: "CV / résumé", note: "Max 2 pages, education + achievements first." }]),
  ];
  if (op.essayRequired) {
    docs.push({ type: "sop", label: "Motivation letter / essay", note: op.essayNote ?? "Tailor it to this program." });
  }
  if (op.moiAccepted) {
    docs.push({
      type: "moiCertificate",
      label: "MOI certificate",
      note: op.moiNote ?? "Proof your prior education was in English — replaces IELTS/TOEFL.",
    });
  } else if (op.englishTests) {
    docs.push({ type: "englishTest", label: "English test result", note: op.englishTests });
  }
  if (op.recommendationsRequired) {
    const n = op.recommendationsCount ?? 1;
    docs.push({
      type: "recommendation",
      label: `Recommendation letter${n > 1 ? `s (×${n})` : ""}`,
      note: op.recommendationsNote ?? "Request referees early — they need 2-3 weeks.",
    });
  }
  if (!op.feeConfirmedFree && op.feeUsd > 0) {
    docs.push({
      type: "feeWaiverEvidence",
      label: "Fee-waiver evidence (optional)",
      note: "Income statement / refugee status etc. — can waive small fees.",
    });
  }
  return docs;
}

// ── Wizard question engine ───────────────────────────────────────────

export interface WizardQuestion {
  key: string;
  question: string;
  hint: string;
  fromProfile?: keyof CopilotProfile;
  multiline?: boolean;
}

/** Application-portal-style questions the wizard prepares paste-ready answers for. */
export function wizardQuestions(op: MinimalOp): WizardQuestion[] {
  const qs: WizardQuestion[] = [
    { key: "fullName", question: "Full name (exactly as in passport)", hint: "Matches your ID document", fromProfile: "fullName" },
    { key: "email", question: "Email address for correspondence", hint: "Use one you check daily", fromProfile: "email" },
    { key: "nationality", question: "Nationality", hint: "As printed on your passport", fromProfile: "nationality" },
    { key: "program", question: "Exact program / award name you are applying to", hint: `${op.name}` },
    {
      key: "whyThis",
      question: `Why ${op.kind === "SCHOLARSHIP" ? "this scholarship" : "this university & program"}? (2-4 sentences)`,
      hint: "Mention 1-2 concrete things: a module, a lab, the funding structure, the country's strengths in your field.",
    },
    {
      key: "careerGoal",
      question: "What will you do with the degree? (career plan)",
      hint: "Be specific — funders love a clear 'return plan'.",
      fromProfile: "careerGoal",
      multiline: true,
    },
    {
      key: "financialNeed",
      question: "Brief funding need statement (if form asks)",
      hint: "One honest paragraph: what you can cover, what the award would cover.",
      multiline: true,
    },
  ];
  if (op.moiAccepted) {
    qs.push({
      key: "moiClaim",
      question: "English-medium instruction claim (for the waiver)",
      hint: "Name your school + years studied in English. Attach MOI certificate.",
      multiline: true,
    });
  }
  if (op.recommendationsRequired) {
    qs.push({
      key: "referees",
      question: "Your referees (name, title, email — one per line)",
      hint: "Ask them BEFORE you start the form; portals email them directly.",
      multiline: true,
    });
  }
  if (op.localLanguageRequired) {
    qs.push({
      key: "localLanguage",
      question: `Local language plan (${op.localLanguageNote ?? "if asked"})`,
      hint: "State current level or the course you'll take.",
      multiline: true,
    });
  }
  return qs;
}

// ── React store (hook-based, cross-instance sync via listeners) ──────

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

const emptySubscribe = () => () => {};

export function useCopilot() {
  // Hydration-safe: SSR renders the empty fallback; localStorage is read
  // in an effect right after mount so the first client render matches the server.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [profile, setProfileState] = useState<CopilotProfile>(EMPTY_PROFILE);
  const [apps, setAppsState] = useState<CopilotApplication[]>([]);
  const [prefs, setPrefsState] = useState<CopilotPrefs>({ emailMode: "ask" });
  // ── Co-Pilot Browser: history & bookmarks ──
  const [browserHistory, setBrowserHistory] = useState<BrowserHistoryItem[]>([]);
  const [browserBookmarks, setBrowserBookmarks] = useState<BrowserBookmark[]>([]);

  // load persisted state once after mount, then keep every hook instance in sync
  useEffect(() => {
    const sync = () => {
      setProfileState(readLS<CopilotProfile>(PROFILE_KEY, EMPTY_PROFILE));
      setAppsState(readLS<CopilotApplication[]>(APPS_KEY, []));
      setPrefsState(readLS<CopilotPrefs>(PREFS_KEY, { emailMode: "ask" }));
      setBrowserHistory(readBrowserHistory());
      setBrowserBookmarks(readBrowserBookmarks());
    };
    sync();
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);

  const setProfile = useCallback((patch: Partial<CopilotProfile>) => {
    const next = { ...readLS<CopilotProfile>(PROFILE_KEY, EMPTY_PROFILE), ...patch, updatedAt: new Date().toISOString() };
    writeLS(PROFILE_KEY, next);
    emit();
  }, []);

  const setPrefs = useCallback((patch: Partial<CopilotPrefs>) => {
    const next = { ...readLS<CopilotPrefs>(PREFS_KEY, { emailMode: "ask" }), ...patch };
    writeLS(PREFS_KEY, next);
    emit();
  }, []);

  const addApplication = useCallback((op: MinimalOp) => {
    const apps = readLS<CopilotApplication[]>(APPS_KEY, []);
    if (apps.some((a) => a.slug === op.slug)) return false;
    const reqDocs = requiredDocs(op);
    const wizardQs = wizardQuestions(op);
    const checklist: Record<string, boolean> = {};
    for (const d of reqDocs) checklist[d.type] = false;
    const app: CopilotApplication = {
      id: op.id,
      slug: op.slug,
      name: op.name,
      kind: op.kind,
      provider: op.provider,
      country: op.country,
      countryCode: op.countryCode,
      officialUrl: op.officialUrl,
      deadlineIso: op.cycle?.nextClose ?? null,
      deadlineNote: op.cycle?.label ?? "",
      feeLabel: op.feeConfirmedFree ? "$0" : op.feeUsd > 0 ? `${op.feeCurrency} ${op.feeAmount}` : "fee applies",
      status: "planned",
      decision: "none",
      addedAt: new Date().toISOString(),
      submittedAt: null,
      notes: "",
      answers: {},
      essayDraft: "",
      checklist,
      reqDocs,
      wizardQs,
      levels: (op as { levels?: string }).levels ?? "",
      fields: (op as { fields?: string }).fields ?? "",
      fundingNote: (op as { fundingNote?: string }).fundingNote ?? "",
      essayNote: (op as { essayNote?: string }).essayNote ?? "",
      moiAccepted: op.moiAccepted,
    };
    writeLS(APPS_KEY, [app, ...apps]);
    emit();
    return true;
  }, []);

  const updateApplication = useCallback((slug: string, patch: Partial<CopilotApplication>) => {
    const apps = readLS<CopilotApplication[]>(APPS_KEY, []);
    writeLS(APPS_KEY, apps.map((a) => (a.slug === slug ? { ...a, ...patch } : a)));
    emit();
  }, []);

  const removeApplication = useCallback((slug: string) => {
    const apps = readLS<CopilotApplication[]>(APPS_KEY, []);
    writeLS(APPS_KEY, apps.filter((a) => a.slug !== slug));
    emit();
  }, []);

  // Documents
  const [docs, setDocs] = useState<DocMeta[]>([]);

  useEffect(() => {
    let alive = true;
    openDB().then((db) => {
      if (!db || !alive) return;
      try {
        const tx = db.transaction(DB_STORE, "readonly");
        const req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = () => {
          if (alive) setDocs((req.result ?? []).map((r: { meta: DocMeta }) => r.meta));
        };
      } catch {
        /* ignore */
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const addDoc = useCallback(async (file: File, type: DocType, label?: string, note = "") => {
    const id = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const meta: DocMeta = {
      id,
      type,
      label: label || file.name,
      mime: file.type || "application/octet-stream",
      size: file.size,
      addedAt: new Date().toISOString(),
      note,
    };
    const ok = await idbPut({ id, meta, file });
    if (ok) setDocs((d) => [...d, meta]);
    return ok;
  }, []);

  const removeDoc = useCallback(async (id: string) => {
    await idbDelete(id);
    setDocs((d) => d.filter((x) => x.id !== id));
  }, []);

  const downloadDoc = useCallback(async (id: string) => {
    const rec = await idbGet(id);
    if (!rec) return;
    const url = URL.createObjectURL(rec.file);
    const a = document.createElement("a");
    a.href = url;
    a.download = rec.meta.label;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const pushBrowserHistory = useCallback((url: string, title: string) => {
    if (!url || !url.startsWith("http")) return;
    const items = readBrowserHistory();
    if (items[0]?.url === url) return;
    writeBrowserHistory([{ url, title, at: new Date().toISOString() }, ...items.filter((i) => i.url !== url)]);
    setBrowserHistory(readBrowserHistory());
    emit();
  }, []);

  const clearBrowserHistory = useCallback(() => {
    writeBrowserHistory([]);
    setBrowserHistory([]);
    emit();
  }, []);

  const addBrowserBookmark = useCallback((url: string, title: string) => {
    const items = readBrowserBookmarks();
    if (items.some((b) => b.url === url)) return;
    writeBrowserBookmarks([
      { id: `bm-${Date.now()}`, url, title: title || url, addedAt: new Date().toISOString() },
      ...items,
    ]);
    setBrowserBookmarks(readBrowserBookmarks());
    emit();
  }, []);

  const removeBrowserBookmark = useCallback((id: string) => {
    writeBrowserBookmarks(readBrowserBookmarks().filter((b) => b.id !== id));
    setBrowserBookmarks(readBrowserBookmarks());
    emit();
  }, []);

  const profileCompletion = (() => {
    const keys: (keyof CopilotProfile)[] = [
      "fullName", "email", "phone", "nationality", "dob", "highestDegree",
      "degreeInstitution", "graduationYear", "gpa", "field", "careerGoal",
    ];
    const filled = keys.filter((k) => String(profile[k] ?? "").trim().length > 0).length;
    return mounted ? Math.round((filled / keys.length) * 100) : 0;
  })();

  return {
    profile,
    setProfile,
    prefs,
    setPrefs,
    apps,
    addApplication,
    updateApplication,
    removeApplication,
    docs,
    addDoc,
    removeDoc,
    downloadDoc,
    profileCompletion,
    browserHistory,
    pushBrowserHistory,
    clearBrowserHistory,
    browserBookmarks,
    addBrowserBookmark,
    removeBrowserBookmark,
  };
}
