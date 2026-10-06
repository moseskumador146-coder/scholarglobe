"use client";

/**
 * Co-Pilot Browser — a real in-app browser for applications.
 *
 *  • Tabs, history, bookmarks, address bar, reload — like a browser
 *  • Every page is served same-origin via /api/browse, so the Co-Pilot can
 *    READ THE SCREEN (forms, headings, text) and AUTO-FILL from the user's
 *    saved profile + documents — instantly, fully client-side (zero latency)
 *  • Only interrupts the user when needed: CAPTCHA, file uploads, passwords,
 *    payments — everything else is pre-filled
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCopilot, DOC_TYPE_ICON, DOC_TYPE_LABEL, type CopilotApplication } from "@/lib/copilot-store";
import {
  ArrowLeft,
  ArrowRight,
  BookMarked,
  Copy,
  CreditCard,
  ExternalLink,
  FileDown,
  FolderLock,
  Globe,
  History,
  Home,
  Loader2,
  Lock,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  RotateCw,
  ShieldAlert,
  Sparkles,
  Upload,
  Wand2,
  X,
} from "lucide-react";

// ── types ────────────────────────────────────────────────────────────

interface BrowserTab {
  id: string;
  url: string; // real target URL ("" = start page)
  title: string;
  loading: boolean;
  history: string[];
  hIdx: number;
}

interface PageField {
  id: string;
  tag: "input" | "textarea" | "select";
  type: string;
  label: string;
  name: string;
  required: boolean;
  options: string[];
}

interface ScreenRead {
  url: string;
  title: string;
  text: string;
  headings: string[];
  fields: PageField[];
  captcha: boolean;
  fileInputs: number;
  passwordInputs: number;
  payment: boolean;
  readAt: number;
}

export interface CopilotBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string;
  appName?: string;
  appSlug?: string;
}

// ── helpers ──────────────────────────────────────────────────────────

const TABS_LS = "sg-copilot-browser-tabs";
let fieldCounter = 0;

const uid = () => `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const prox = (tab: string, url: string, r?: number) =>
  `/api/browse?tab=${encodeURIComponent(tab)}&u=${encodeURIComponent(url)}${r ? `&r=${r}` : ""}`;

function unwrapUrl(u: string): string {
  try {
    const parsed = new URL(u, window.location.origin);
    if (parsed.pathname === "/api/browse") {
      const inner = parsed.searchParams.get("u");
      if (inner) return inner;
    }
    if (parsed.protocol.startsWith("http")) return parsed.toString();
    return u;
  } catch {
    return u;
  }
}

const hostOf = (u: string) => {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return u.slice(0, 40);
  }
};

const looksLikeUrl = (s: string) =>
  /^https?:\/\//i.test(s) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s.trim());

const SEARCH_URL = "https://html.duckduckgo.com/html/?q=";

function findLabelText(el: HTMLElement, doc: Document): string {
  try {
    const id = el.getAttribute("id");
    if (id) {
      const l = doc.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (l?.textContent) return l.textContent.trim().slice(0, 90);
    }
    const aria = el.getAttribute("aria-label");
    if (aria) return aria.slice(0, 90);
    const ph = (el as HTMLInputElement).placeholder;
    if (ph) return ph.slice(0, 90);
    const wrap = el.closest("label");
    if (wrap?.textContent) return wrap.textContent.trim().slice(0, 90);
    const name = el.getAttribute("name");
    if (name) return name.slice(0, 90);
    // previous text node sibling
    let prev = el.previousElementSibling;
    for (let i = 0; i < 3 && prev; i++) {
      const t = prev.textContent?.trim();
      if (t) return t.slice(0, 90);
      prev = prev.previousElementSibling as Element | null;
    }
  } catch {
    /* noop */
  }
  return el.getAttribute("name") || (el as HTMLInputElement).type || "field";
}

function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : el instanceof HTMLSelectElement
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  try {
    desc?.set?.call(el, value);
  } catch {
    el.value = value;
  }
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

interface BankEntry {
  key: string;
  label: string;
  value: string;
  re: RegExp;
  textarea?: boolean;
}

function buildBank(profile: Record<string, unknown>, app: CopilotApplication | undefined): BankEntry[] {
  const full = String(profile.fullName ?? "").trim();
  const parts = full.split(/\s+/).filter(Boolean);
  const sop = app?.essayDraft?.trim() || app?.answers?.whyThis?.trim() || "";
  const bank: BankEntry[] = [
    { key: "firstName", label: "First name", value: parts[0] ?? "", re: /first[\s_-]?name|given[\s_-]?name|forename/i },
    { key: "lastName", label: "Last name", value: parts.slice(1).join(" "), re: /last[\s_-]?name|sur[\s_-]?name|family[\s_-]?name/i },
    { key: "fullName", label: "Full name", value: full, re: /full[\s_-]?name|^\s*name[\s_*:]|$^applicant|candidate[\s_-]?name|^name$/i },
    { key: "email", label: "Email", value: String(profile.email ?? ""), re: /e[\s_-]?mail/i },
    { key: "phone", label: "Phone", value: String(profile.phone ?? ""), re: /phone|mobile|tel\b|whatsapp|contact[\s_-]?number/i },
    { key: "dob", label: "Date of birth", value: String(profile.dob ?? ""), re: /birth|\bdob\b|d\.o\.b/i },
    { key: "nationality", label: "Nationality", value: String(profile.nationality ?? ""), re: /nationality|citizen/i },
    { key: "address", label: "Address", value: String(profile.address ?? ""), re: /address|street|postal|zip|city\b/i },
    { key: "degreeInstitution", label: "University / institution", value: String(profile.degreeInstitution ?? ""), re: /universit|institution|\bschool\b|college|alma[\s_-]?mater/i },
    { key: "highestDegree", label: "Degree", value: String(profile.highestDegree ?? ""), re: /degree|qualification|diploma/i },
    { key: "graduationYear", label: "Graduation year", value: String(profile.graduationYear ?? ""), re: /graduat|completion[\s_-]?year|year[\s_-]?completed/i },
    { key: "gpa", label: "GPA", value: String(profile.gpa ?? ""), re: /\bgpa\b|\bcgpa\b|grade[\s_-]?point|grade[\s_-]?average|class[\s_-]?of[\s_-]?degree/i },
    { key: "field", label: "Field of study", value: String(profile.field ?? ""), re: /field[\s_-]?of[\s_-]?study|course[\s_-]?of[\s_-]?study|\bmajor\b|discipline|programme[\s_-]?of/i },
    { key: "careerGoal", label: "Career goal", value: String(profile.careerGoal ?? ""), re: /career|future[\s_-]?plan|\bgoal\b|aspiration/i, textarea: true },
    { key: "achievements", label: "Achievements", value: String(profile.achievements ?? ""), re: /achievement|award|honou?r|prize/i, textarea: true },
    { key: "englishTestDetails", label: "English / MOI details", value: String(profile.englishTestDetails ?? ""), re: /english[\s_-]?test|ielts|toefl|medium[\s_-]?of[\s_-]?instruction|\bmoi\b/i },
    { key: "sop", label: "Motivation letter", value: sop, re: /motivat|personal[\s_-]?statement|statement[\s_-]?of[\s_-]?purpose|essay|why[\s_-]?(this|do[\s_-]?you|us|are[\s_-]?you)/i, textarea: true },
  ];
  return bank.filter((b) => b.value && String(b.value).trim().length > 0);
}

function matchBank(field: PageField, bank: BankEntry[]): BankEntry | null {
  const hay = `${field.label} ${field.name} ${field.id}`;
  for (const b of bank) {
    if (b.re.test(hay)) {
      if (field.tag === "textarea" && !b.textarea && b.key !== "address") continue;
      return b;
    }
  }
  return null;
}

// ── component ────────────────────────────────────────────────────────

export function CopilotBrowser({ open, onOpenChange, initialUrl, appName, appSlug }: CopilotBrowserProps) {
  const { profile, docs, apps, downloadDoc, pushBrowserHistory, browserHistory, browserBookmarks, addBrowserBookmark, removeBrowserBookmark, clearBrowserHistory } = useCopilot();
  const { toast } = useToast();

  const [tabs, setTabs] = useState<BrowserTab[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [reloadKeys, setReloadKeys] = useState<Record<string, number>>({});
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelTab, setPanelTab] = useState<"screen" | "docs" | "answers">("screen");
  const [reads, setReads] = useState<Record<string, ScreenRead>>({});
  const [guide, setGuide] = useState<Record<string, string>>({});
  const [guideBusy, setGuideBusy] = useState(false);
  const [mapBusy, setMapBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addr, setAddr] = useState("");

  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});
  const focusRef = useRef<{ tabId: string; el: HTMLElement } | null>(null);
  const trackedDocs = useRef<WeakSet<Document>>(new WeakSet());
  const initedRef = useRef(false);
  const lastInitialRef = useRef<string | undefined>(undefined);

  const app = useMemo(() => (appSlug ? apps.find((a) => a.slug === appSlug) : undefined), [apps, appSlug]);
  const active = tabs.find((t) => t.id === activeId) ?? null;
  const activeRead: ScreenRead | null = active ? reads[active.id] ?? null : null;

  // ── init tabs on first open ──
  useEffect(() => {
    if (!open || initedRef.current) return;
    initedRef.current = true;
    let restored: BrowserTab[] = [];
    try {
      const saved = JSON.parse(window.localStorage.getItem(TABS_LS) ?? "[]") as { url: string; title: string }[];
      restored = saved
        .filter((s) => s.url && s.url.startsWith("http"))
        .slice(0, 6)
        .map((s) => ({
          id: uid(),
          url: s.url,
          title: s.title || hostOf(s.url),
          loading: true,
          history: [s.url],
          hIdx: 0,
        }));
    } catch {
      restored = [];
    }
    if (initialUrl) {
      restored = restored.filter((t) => unwrapUrl(t.url) !== initialUrl);
      restored.unshift({ id: uid(), url: initialUrl, title: appName || hostOf(initialUrl), loading: true, history: [initialUrl], hIdx: 0 });
    }
    if (restored.length === 0) {
      restored = [{ id: uid(), url: "", title: "Start", loading: false, history: [], hIdx: -1 }];
    }
    setTabs(restored);
    setActiveId(restored[0].id);
    setAddr(restored[0].url === "" ? "" : restored[0].url);
  }, [open, initialUrl, appName]);

  // follow a NEW initialUrl while open (e.g. another kit's portal)
  useEffect(() => {
    if (!open || !initedRef.current) return;
    if (initialUrl && initialUrl !== lastInitialRef.current) {
      lastInitialRef.current = initialUrl;
      setTabs((ts) => {
        const existing = ts.find((t) => t.url === initialUrl);
        if (existing) {
          setActiveId(existing.id);
          return ts;
        }
        const nt: BrowserTab = { id: uid(), url: initialUrl, title: appName || hostOf(initialUrl), loading: true, history: [initialUrl], hIdx: 0 };
        setActiveId(nt.id);
        return [...ts, nt];
      });
    }
  }, [open, initialUrl, appName]);

  // persist tab urls
  useEffect(() => {
    if (!open) return;
    try {
      window.localStorage.setItem(
        TABS_LS,
        JSON.stringify(tabs.filter((t) => t.url).map((t) => ({ url: t.url, title: t.title })))
      );
    } catch {
      /* noop */
    }
  }, [tabs, open]);

  // ── navigation ──
  const navigate = useCallback(
    (tabId: string, url: string, push = true) => {
      setTabs((ts) =>
        ts.map((t) => {
          if (t.id !== tabId) return t;
          const history = push ? [...t.history.slice(0, t.hIdx + 1), url] : t.history;
          return { ...t, url, loading: !!url, title: url ? t.title : "Start", history, hIdx: push ? history.length - 1 : t.hIdx };
        })
      );
      setAddr(url === "" ? "" : url);
      if (url) {
        const timer = setTimeout(() => {
          setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, loading: false } : t)));
        }, 15000);
        void timer;
      }
    },
    []
  );

  const go = (delta: number) => {
    if (!active) return;
    const idx = active.hIdx + delta;
    if (idx < 0 || idx >= active.history.length) return;
    navigate(active.id, active.history[idx], false);
  };

  const reload = () => {
    if (!active?.url) return;
    try {
      iframeRefs.current[active.id]?.contentWindow?.location.reload();
    } catch {
      setReloadKeys((rk) => ({ ...rk, [active.id]: (rk[active.id] ?? 0) + 1 }));
    }
  };

  const addTab = (url = "") => {
    const nt: BrowserTab = { id: uid(), url, title: url ? hostOf(url) : "Start", loading: !!url, history: url ? [url] : [], hIdx: url ? 0 : -1 };
    setTabs((ts) => [...ts, nt]);
    setActiveId(nt.id);
    setAddr(url);
  };

  const closeTab = (id: string) => {
    setTabs((ts) => {
      const idx = ts.findIndex((t) => t.id === id);
      const next = ts.filter((t) => t.id !== id);
      if (id === activeId && next.length > 0) {
        const nb = next[Math.min(idx, next.length - 1)];
        setActiveId(nb.id);
        setAddr(nb.url);
      }
      return next.length > 0 ? next : [{ id: uid(), url: "", title: "Start", loading: false, history: [], hIdx: -1 }];
    });
  };

  // ── focus tracking in page (for "fill focused field") ──
  const attachFocusTracker = useCallback((tabId: string, doc: Document) => {
    if (trackedDocs.current.has(doc)) return;
    trackedDocs.current.add(doc);
    doc.addEventListener(
      "focusin",
      (e) => {
        const el = e.target as HTMLElement;
        if (el && /^(input|textarea|select)$/i.test(el.tagName)) focusRef.current = { tabId, el };
      },
      true
    );
  }, []);

  // ── screen reader ──
  const readScreen = useCallback(
    (tabId: string): ScreenRead | null => {
      const ifr = iframeRefs.current[tabId];
      const doc = ifr?.contentDocument;
      if (!doc || !doc.body) return null;
      try {
        const els = Array.from(doc.querySelectorAll("input, textarea, select")) as HTMLElement[];
        const fields: PageField[] = [];
        for (const el of els) {
          const tag = el.tagName.toLowerCase() as PageField["tag"];
          const type = tag === "input" ? ((el as HTMLInputElement).type || "text").toLowerCase() : tag;
          if (type === "hidden" || type === "submit" || type === "button" || type === "reset" || type === "image") continue;
          let id = el.getAttribute("data-sgfid");
          if (!id) {
            fieldCounter += 1;
            id = `f${fieldCounter}`;
            el.setAttribute("data-sgfid", id);
          }
          const rect = (el as HTMLElement).getBoundingClientRect();
          const visible = rect.width > 0 && rect.height > 0;
          if (!visible && type !== "file") continue;
          fields.push({
            id,
            tag,
            type,
            label: findLabelText(el, doc),
            name: el.getAttribute("name") ?? "",
            required: el.hasAttribute("required") || el.getAttribute("aria-required") === "true",
            options:
              tag === "select"
                ? Array.from((el as HTMLSelectElement).options)
                    .slice(0, 12)
                    .map((o) => o.text)
                    .filter((t) => t.trim())
                : [],
          });
        }
        const bodyText = (doc.querySelector("main") ?? doc.body).innerText || "";
        const captcha = !!doc.querySelector(
          "iframe[src*='recaptcha'], iframe[src*='hcaptcha'], .g-recaptcha, .h-captcha, .cf-turnstile, [class*='captcha'], [id*='captcha'], [class*='turnstile'], [class*='geetest']"
        );
        const fileInputs = doc.querySelectorAll("input[type='file']").length;
        const passwordInputs = doc.querySelectorAll("input[type='password']").length;
        const payment = /card\s*number|\bcvv\b|payment|checkout|application\s*fee|billing/i.test(bodyText.slice(0, 5000));
        const headings = Array.from(doc.querySelectorAll("h1, h2, h3"))
          .slice(0, 8)
          .map((h) => (h.textContent ?? "").trim())
          .filter((t) => t && t.length < 140);
        const read: ScreenRead = {
          url: unwrapUrl(doc.location?.href ?? ""),
          title: doc.title || "",
          text: bodyText.replace(/\s+/g, " ").trim().slice(0, 6000),
          headings,
          fields,
          captcha,
          fileInputs,
          passwordInputs,
          payment,
          readAt: Date.now(),
        };
        attachFocusTracker(tabId, doc);
        return read;
      } catch {
        return null;
      }
    },
    [attachFocusTracker]
  );

  const runRead = useCallback(
    (tabId: string) => {
      const r = readScreen(tabId);
      if (r) setReads((rs) => ({ ...rs, [tabId]: r }));
      return r;
    },
    [readScreen]
  );

  // ── iframe load handler ──
  const handleLoad = useCallback(
    (tabId: string) => {
      const ifr = iframeRefs.current[tabId];
      if (!ifr) return;
      let realUrl = "";
      let title = "";
      try {
        realUrl = unwrapUrl(ifr.contentWindow?.location.href ?? "");
        title = ifr.contentDocument?.title || hostOf(realUrl);
      } catch {
        /* cross-origin — keep old */
      }
      setTabs((ts) =>
        ts.map((t) => (t.id === tabId ? { ...t, loading: false, ...(realUrl ? { url: realUrl, title } : {}) } : t))
      );
      if (realUrl) pushBrowserHistory(realUrl, title);
      setTimeout(() => runRead(tabId), 350);
    },
    [pushBrowserHistory, runRead]
  );

  // ── injected-script messages (SPA nav, new tabs) ──
  useEffect(() => {
    if (!open) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      const d = e.data as { source?: string; type?: string; url?: string; title?: string };
      if (!d || d.source !== "sg-copilot-page") return;
      const entry = Object.entries(iframeRefs.current).find(([, f]) => f?.contentWindow === e.source);
      const tabId = entry?.[0];
      if (!tabId) return;
      if (d.type === "nav" && d.url) {
        const real = unwrapUrl(d.url);
        setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, url: real, title: d.title || t.title, loading: false } : t)));
        pushBrowserHistory(real, d.title ?? "");
      }
      if (d.type === "newtab" && d.url) addTab(unwrapUrl(d.url));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pushBrowserHistory]);

  // ── autofill ──
  const bank = useMemo(() => buildBank(profile as unknown as Record<string, unknown>, app), [profile, app]);

  const fillElement = (tabId: string, field: PageField, value: string): boolean => {
    const doc = iframeRefs.current[tabId]?.contentDocument;
    if (!doc) return false;
    try {
      const el = doc.querySelector(`[data-sgfid="${field.id}"]`) as
        | HTMLInputElement
        | HTMLTextAreaElement
        | HTMLSelectElement
        | null;
      if (!el || el.disabled || (el as HTMLInputElement).readOnly) return false;
      if (field.type === "password" || field.type === "file") return false;
      if (field.tag === "select") {
        const sel = el as HTMLSelectElement;
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");
        const v = norm(value);
        const opt = Array.from(sel.options).find(
          (o) => norm(o.text).includes(v) || norm(o.value).includes(v) || v.includes(norm(o.text))
        );
        if (!opt) return false;
        setNativeValue(sel, opt.value);
        return true;
      }
      if ((el as HTMLInputElement).type === "checkbox" || (el as HTMLInputElement).type === "radio") return false;
      const current = (el as HTMLInputElement).value?.trim();
      if (current && current === value.trim()) return false;
      setNativeValue(el, value);
      return true;
    } catch {
      return false;
    }
  };

  const fillAll = () => {
    if (!active) return;
    const read = reads[active.id] ?? runRead(active.id);
    if (!read) {
      toast({ title: "Could not read this page", description: "Try the Reload button, then Read again." });
      return;
    }
    let filled = 0;
    let attempted = 0;
    for (const f of read.fields) {
      if (f.type === "password" || f.type === "file" || f.type === "checkbox" || f.type === "radio") continue;
      const b = matchBank(f, bank);
      if (!b) continue;
      attempted += 1;
      if (fillElement(active.id, f, b.value)) filled += 1;
    }
    toast({
      title: `Filled ${filled} field${filled === 1 ? "" : "s"} ✨`,
      description: attempted
        ? "Review before submitting — the co-pilot only fills what it is sure about."
        : "No fields matched your profile on this page — use the field list to fill individually.",
    });
    if (panelTab !== "screen") setPanelTab("screen");
    setPanelOpen(true);
  };

  const fillOne = (field: PageField, value: string) => {
    if (!active) return;
    const ok = fillElement(active.id, field, value);
    toast({ title: ok ? "Filled ✓" : "Could not fill this field", description: ok ? field.label : "It may be disabled, hidden, or a special input." });
  };

  const fillFocused = (value: string) => {
    const fr = focusRef.current;
    if (!fr || (active && fr.tabId !== active.id)) {
      toast({ title: "Click inside a field on the page first", description: "Then press “fill focused field” again." });
      return;
    }
    try {
      const el = fr.el as HTMLInputElement | HTMLTextAreaElement;
      setNativeValue(el, value);
      toast({ title: "Filled focused field ✓" });
    } catch {
      toast({ title: "Could not fill the focused field", variant: "destructive" });
    }
  };

  // ── AI assists ──
  const askGuide = async () => {
    if (!active) return;
    const read = reads[active.id] ?? runRead(active.id);
    if (!read) return;
    setPanelOpen(true);
    setPanelTab("screen");
    setGuideBusy(true);
    try {
      const res = await fetch("/api/browse-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "guide",
          pageText: read.text,
          fields: read.fields.slice(0, 25).map((f) => ({ id: f.id, label: f.label, type: f.type, required: f.required })),
          appName: appName ?? active.title,
        }),
      }).then((r) => r.json());
      setGuide((g) => ({ ...g, [active.id]: res.guidance ?? res.error ?? "No guidance available." }));
    } catch {
      setGuide((g) => ({ ...g, [active.id]: "AI guidance unavailable right now — the page tools still work." }));
    } finally {
      setGuideBusy(false);
    }
  };

  const smartMap = async () => {
    if (!active) return;
    const read = reads[active.id] ?? runRead(active.id);
    if (!read) return;
    setMapBusy(true);
    try {
      const res = await fetch("/api/browse-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "map",
          fields: read.fields.map((f) => ({ id: f.id, label: f.label, type: f.type, required: f.required, options: f.options })),
          profile,
        }),
      }).then((r) => r.json());
      const fills = (res.fills ?? {}) as Record<string, string>;
      let n = 0;
      for (const [id, value] of Object.entries(fills)) {
        const f = read.fields.find((x) => x.id === id);
        if (f && value && fillElement(active.id, f, String(value))) n += 1;
      }
      toast({ title: `Smart map filled ${n} field${n === 1 ? "" : "s"} 🤖`, description: "AI matched your profile to the form — review everything." });
    } catch {
      toast({ title: "Smart mapping unavailable right now", description: "Use the instant fill instead — it works offline." });
    } finally {
      setMapBusy(false);
    }
  };

  // ── address bar submit ──
  const submitAddr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!active) return;
    const val = addr.trim();
    if (!val) return;
    const url = looksLikeUrl(val) ? (val.startsWith("http") ? val : `https://${val}`) : SEARCH_URL + encodeURIComponent(val);
    navigate(active.id, url);
  };

  const bookmarked = !!active?.url && browserBookmarks.some((b) => b.url === active.url);

  // ── needs-you alerts ──
  const alerts: { icon: React.ReactNode; title: string; desc: string }[] = [];
  if (activeRead?.captcha)
    alerts.push({
      icon: <ShieldAlert className="h-3.5 w-3.5 text-destructive" />,
      title: "CAPTCHA on this page — needs you",
      desc: "Security check: solve it in the page above, then continue. Everything else stays pre-filled.",
    });
  if ((activeRead?.fileInputs ?? 0) > 0)
    alerts.push({
      icon: <Upload className="h-3.5 w-3.5 text-warning" />,
      title: `${activeRead?.fileInputs} file upload${activeRead?.fileInputs === 1 ? "" : "s"} here`,
      desc: "Browsers only let YOU choose files — download your documents from the Docs panel, then pick them.",
    });
  if ((activeRead?.passwordInputs ?? 0) > 0)
    alerts.push({
      icon: <Lock className="h-3.5 w-3.5 text-warning" />,
      title: "Password field — type it yourself",
      desc: "The co-pilot never reads or stores passwords.",
    });
  if (activeRead?.payment)
    alerts.push({
      icon: <CreditCard className="h-3.5 w-3.5 text-warning" />,
      title: "Payment step detected",
      desc: "Check the amount carefully. If a fee waiver applies, send the waiver email from the kit first.",
    });

  // ── render ──
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-[100vw] translate-x-[-50%] translate-y-[-50%] flex-col gap-0 overflow-hidden rounded-none border-0 p-0"
        aria-describedby={undefined}
      >
        {/* ── tab strip ── */}
        <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-secondary/70 px-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveId(t.id);
                setAddr(t.url === "" ? "" : t.url);
              }}
              className={`group flex h-7 max-w-[180px] shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-medium transition ${
                t.id === activeId ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:bg-background/60"
              }`}
              title={t.title || "New tab"}
            >
              {t.loading ? <Loader2 className="h-3 w-3 shrink-0 animate-spin" /> : <Globe className="h-3 w-3 shrink-0 opacity-60" />}
              <span className="truncate">{t.title || "New tab"}</span>
              <span
                role="button"
                tabIndex={0}
                aria-label="Close tab"
                className="ml-0.5 rounded p-0.5 opacity-0 transition hover:bg-destructive/15 hover:text-destructive group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
                onKeyDown={(e) => e.key === "Enter" && closeTab(t.id)}
              >
                <X className="h-2.5 w-2.5" />
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => addTab("")}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-background/60 hover:text-foreground"
            aria-label="New tab"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <div className="ml-auto flex shrink-0 items-center gap-1 pl-2">
            {appName && (
              <Badge variant="outline" className="hidden max-w-[220px] truncate border-primary/40 text-[9px] sm:inline-flex">
                🎯 {appName}
              </Badge>
            )}
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px]" onClick={() => onOpenChange(false)}>
              Close browser <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* ── toolbar ── */}
        <div className="flex h-12 shrink-0 items-center gap-1 border-b border-border bg-background px-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => go(-1)} disabled={!active || active.hIdx <= 0} aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => go(1)} disabled={!active || active.hIdx >= active.history.length - 1} aria-label="Forward">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={reload} disabled={!active?.url} aria-label="Reload">
            <RotateCw className={`h-4 w-4 ${active?.loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="hidden h-8 w-8 sm:inline-flex" onClick={() => active && navigate(active.id, "")} aria-label="Start page">
            <Home className="h-4 w-4" />
          </Button>
          <form onSubmit={submitAddr} className="mx-1 flex-1">
            <Input
              value={addr}
              onChange={(e) => setAddr(e.target.value)}
              placeholder="Search the web or type an address — Enter to go"
              className="h-9 rounded-full bg-secondary/60 text-xs sm:text-[13px]"
              aria-label="Address bar"
              spellCheck={false}
              autoComplete="off"
            />
          </form>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 sm:inline-flex"
            onClick={() => {
              if (!active?.url) return;
              if (bookmarked) {
                const bm = browserBookmarks.find((b) => b.url === active.url);
                if (bm) removeBrowserBookmark(bm.id);
                toast({ title: "Bookmark removed" });
              } else {
                addBrowserBookmark(active.url, active.title || hostOf(active.url));
                toast({ title: "Bookmarked ★" });
              }
            }}
            disabled={!active?.url}
            aria-label={bookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <BookMarked className={`h-4 w-4 ${bookmarked ? "text-warning" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setHistoryOpen((h) => !h)} aria-label="History">
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden h-8 w-8 md:inline-flex"
            onClick={() => active?.url && window.open(active.url, "_blank", "noopener,noreferrer")}
            disabled={!active?.url}
            aria-label="Open in a real browser tab"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant={panelOpen ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8 shrink-0 text-primary"
            onClick={() => setPanelOpen((p) => !p)}
            aria-label="Toggle co-pilot panel"
          >
            {panelOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </Button>
        </div>

        {/* loading bar */}
        {active?.loading && (
          <div className="h-0.5 w-full shrink-0 overflow-hidden bg-primary/20">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
          </div>
        )}

        {/* ── body ── */}
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          {/* viewport */}
          <div className="relative min-w-0 flex-1 bg-muted/40">
            {tabs.map((t) => (
              <div key={t.id} className={`absolute inset-0 ${t.id === activeId ? "" : "hidden"}`}>
                {t.url ? (
                  <iframe
                    ref={(el) => {
                      iframeRefs.current[t.id] = el;
                    }}
                    src={prox(t.id, t.url, reloadKeys[t.id])}
                    title={t.title || "Co-Pilot browser"}
                    className="h-full w-full border-0 bg-white"
                    onLoad={() => handleLoad(t.id)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <StartPage
                    onGo={(u) => navigate(t.id, u)}
                    apps={apps}
                    bookmarks={browserBookmarks}
                    history={browserHistory}
                  />
                )}
              </div>
            ))}
          </div>

          {/* history slide-over */}
          {historyOpen && (
            <div className="absolute inset-y-0 left-0 z-20 w-72 border-r border-border bg-background/95 shadow-xl backdrop-blur sm:w-80">
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <p className="text-xs font-bold text-foreground">History</p>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                    onClick={() => {
                      clearBrowserHistory();
                      toast({ title: "History cleared" });
                    }}
                  >
                    Clear
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setHistoryOpen(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="h-[calc(100%-41px)] overflow-y-auto p-2">
                {browserHistory.length === 0 ? (
                  <p className="p-3 text-[11px] text-muted-foreground">Pages you visit in the co-pilot browser appear here.</p>
                ) : (
                  browserHistory.map((h) => (
                    <button
                      key={`${h.url}-${h.at}`}
                      type="button"
                      className="block w-full rounded-lg px-2.5 py-2 text-left transition hover:bg-secondary"
                      onClick={() => {
                        if (active) navigate(active.id, h.url);
                        setHistoryOpen(false);
                      }}
                    >
                      <span className="block truncate text-[11px] font-semibold text-foreground">{h.title || hostOf(h.url)}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">{h.url}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ── co-pilot panel ── */}
          {panelOpen && (
            <div className="absolute inset-0 z-30 flex flex-col border-l border-border bg-background lg:relative lg:z-0 lg:w-[360px] lg:shrink-0">
              <div className="flex h-10 shrink-0 items-center justify-between border-b border-border px-3">
                <div className="flex gap-1">
                  {(
                    [
                      ["screen", "Screen & fill", <Wand2 key="w" className="h-3 w-3" />],
                      ["docs", "Docs", <FolderLock key="d" className="h-3 w-3" />],
                      ["answers", "Answers", <Copy key="c" className="h-3 w-3" />],
                    ] as const
                  ).map(([v, label, icon]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setPanelTab(v)}
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold transition ${
                        panelTab === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={() => setPanelOpen(false)} aria-label="Close panel">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {/* needs-you alerts */}
                {alerts.length > 0 && (
                  <div className="mb-3 space-y-1.5">
                    {alerts.map((a) => (
                      <div key={a.title} className="rounded-xl border border-destructive/30 bg-destructive/5 p-2.5">
                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
                          {a.icon} {a.title}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{a.desc}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* SCREEN & FILL */}
                {panelTab === "screen" && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" className="h-8 gap-1.5 bg-primary text-[11px] font-bold" onClick={fillAll}>
                        <Wand2 className="h-3.5 w-3.5" /> Instant fill from profile
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]" onClick={smartMap} disabled={mapBusy}>
                        {mapBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} AI smart map
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1.5 text-[11px]" onClick={askGuide} disabled={guideBusy}>
                        {guideBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Read screen with AI
                      </Button>
                    </div>

                    {guide[activeId] && (
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-2.5 text-[11px] leading-relaxed text-foreground">
                        <p className="mb-1 font-bold text-primary">Co-pilot read of this page</p>
                        {guide[activeId]}
                      </div>
                    )}

                    {!active?.url && (
                      <p className="rounded-xl border border-dashed border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
                        Open a page (type an address or pick a portal from the start page) — the co-pilot reads every form and
                        pre-fills what it can from your profile and documents.
                      </p>
                    )}

                    {activeRead && (
                      <>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {activeRead.fields.length} field{activeRead.fields.length === 1 ? "" : "s"} found · {hostOf(activeRead.url)}
                        </p>
                        <div className="space-y-1.5">
                          {activeRead.fields.length === 0 && (
                            <p className="text-[11px] text-muted-foreground">No form fields detected on this page.</p>
                          )}
                          {activeRead.fields.map((f) => {
                            const b = matchBank(f, bank);
                            return (
                              <div key={f.id} className="rounded-lg border border-border bg-secondary/30 p-2">
                                <p className="flex items-center gap-1.5 truncate text-[10px] font-semibold text-foreground">
                                  <span className="rounded bg-secondary px-1 py-0.5 text-[8px] uppercase">{f.type}</span>
                                  <span className="truncate">{f.label}</span>
                                  {f.required && <span className="text-destructive">*</span>}
                                </p>
                                {f.tag === "select" && f.options.length > 0 && (
                                  <p className="mt-0.5 truncate text-[9px] text-muted-foreground">options: {f.options.slice(0, 4).join(" · ")}</p>
                                )}
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {b && (
                                    <button
                                      type="button"
                                      className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold text-primary hover:bg-primary/20"
                                      onClick={() => fillOne(f, b.value)}
                                    >
                                      fill: {b.label} ⤵
                                    </button>
                                  )}
                                  {app?.answers && (
                                    <button
                                      type="button"
                                      className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-foreground hover:bg-accent"
                                      onClick={() => {
                                        const first = Object.values(app.answers).find((v) => v.trim());
                                        if (first) fillOne(f, first);
                                      }}
                                    >
                                      paste an answer
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="rounded-full bg-secondary px-2 py-0.5 text-[9px] font-semibold text-foreground hover:bg-accent"
                                    onClick={() => {
                                      focusRef.current = { tabId: active.id, el: (iframeRefs.current[active.id]?.contentDocument?.querySelector(`[data-sgfid="${f.id}"]`) ?? null) as HTMLElement };
                                      toast({ title: "Field marked — now pick a value below" });
                                    }}
                                  >
                                    mark for focus fill
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* DOCS */}
                {panelTab === "docs" && (
                  <div className="space-y-2">
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      Your documents, ready to upload: press <strong className="text-foreground">Download</strong> then pick the file
                      in the page&apos;s upload button. Files never leave this device.
                    </p>
                    {docs.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-border p-3 text-[11px] text-muted-foreground">
                        Vault is empty — upload passport, transcripts, CV etc. in the Documents tab of the co-pilot.
                      </p>
                    ) : (
                      docs.map((d) => (
                        <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2">
                          <span className="text-base">{DOC_TYPE_ICON[d.type]}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[11px] font-semibold text-foreground">{d.label}</p>
                            <p className="truncate text-[9px] text-muted-foreground">
                              {DOC_TYPE_LABEL[d.type]} · {(d.size / 1024).toFixed(0)} KB
                            </p>
                          </div>
                          <Button size="sm" variant="outline" className="h-7 gap-1 text-[10px]" onClick={() => downloadDoc(d.id)}>
                            <FileDown className="h-3 w-3" /> Download
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ANSWERS */}
                {panelTab === "answers" && (
                  <div className="space-y-2">
                    {!app ? (
                      <p className="rounded-xl border border-dashed border-border p-3 text-[11px] leading-relaxed text-muted-foreground">
                        Open the browser from a submission kit to bring this application&apos;s prepared answers here — or launch it
                        from the portal button on any kit.
                      </p>
                    ) : (
                      <>
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Prepared answers for <strong className="text-foreground">{app.name}</strong>: click inside a field on the
                          page, then press <strong className="text-foreground">Fill focused</strong>.
                        </p>
                        {Object.entries(app.answers).filter(([, v]) => v.trim()).length === 0 && (
                          <p className="text-[11px] text-muted-foreground">No answers yet — complete the Wizard tab first.</p>
                        )}
                        {Object.entries(app.answers)
                          .filter(([, v]) => v.trim())
                          .map(([k, v]) => (
                            <div key={k} className="rounded-lg border border-border bg-secondary/30 p-2">
                              <p className="truncate text-[10px] font-bold text-foreground">{k}</p>
                              <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{v}</p>
                              <div className="mt-1 flex gap-1">
                                <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[9px]" onClick={() => fillFocused(v)}>
                                  Fill focused ⤵
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 gap-1 px-2 text-[9px]"
                                  onClick={async () => {
                                    try {
                                      await navigator.clipboard.writeText(v);
                                      toast({ title: "Answer copied" });
                                    } catch {
                                      /* noop */
                                    }
                                  }}
                                >
                                  <Copy className="h-3 w-3" /> Copy
                                </Button>
                              </div>
                            </div>
                          ))}
                        {app.essayDraft && (
                          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
                            <p className="text-[10px] font-bold text-primary">Motivation letter draft</p>
                            <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">{app.essayDraft}</p>
                            <div className="mt-1 flex gap-1">
                              <Button size="sm" variant="outline" className="h-6 gap-1 px-2 text-[9px]" onClick={() => fillFocused(app.essayDraft)}>
                                Fill focused ⤵
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 gap-1 px-2 text-[9px]"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(app.essayDraft);
                                    toast({ title: "Letter copied" });
                                  } catch {
                                    /* noop */
                                  }
                                }}
                              >
                                <Copy className="h-3 w-3" /> Copy
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── start page ───────────────────────────────────────────────────────

function StartPage({
  onGo,
  apps,
  bookmarks,
  history,
}: {
  onGo: (url: string) => void;
  apps: CopilotApplication[];
  bookmarks: { id: string; url: string; title: string }[];
  history: { url: string; title: string }[];
}) {
  const [q, setQ] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = q.trim();
    if (!val) return;
    const url = looksLikeUrl(val) ? (val.startsWith("http") ? val : `https://${val}`) : SEARCH_URL + encodeURIComponent(val);
    onGo(url);
  };
  const quick = [
    { label: "DuckDuckGo search", url: "https://html.duckduckgo.com/html/?q=university+application+portal" },
    { label: "Wikipedia", url: "https://en.wikipedia.org" },
  ];
  return (
    <div className="flex h-full items-start justify-center overflow-y-auto bg-gradient-to-b from-primary/5 to-transparent p-6 sm:p-10">
      <div className="w-full max-w-xl">
        <p className="text-center text-3xl">🧭</p>
        <h2 className="mt-2 text-center text-lg font-extrabold text-foreground">Co-Pilot Browser</h2>
        <p className="mx-auto mt-1 max-w-md text-center text-[11px] leading-relaxed text-muted-foreground">
          Open the official portal here — the co-pilot reads the page, pre-fills your details from the vault, and only
          interrupts you for CAPTCHAs, uploads, passwords and payments. Logins work: cookies stay inside each tab for this
          session.
        </p>
        <form onSubmit={submit} className="mx-auto mt-4 flex max-w-md gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or type a URL…" className="h-10 rounded-full bg-background" aria-label="Search or address" />
          <Button type="submit" className="h-10 rounded-full px-5">Go</Button>
        </form>

        {apps.length > 0 && (
          <>
            <p className="mt-6 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Your application portals</p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {apps.slice(0, 6).map((a) => (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => onGo(a.officialUrl)}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-left transition hover:border-primary/40"
                >
                  <span className="text-sm">🎯</span>
                  <span className="min-w-0">
                    <span className="block truncate text-[11px] font-semibold text-foreground">{a.name}</span>
                    <span className="block truncate text-[9px] text-muted-foreground">{hostOf(a.officialUrl)}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {bookmarks.length > 0 && (
          <>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Bookmarks</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {bookmarks.map((b) => (
                <button key={b.id} type="button" onClick={() => onGo(b.url)} className="max-w-[240px] truncate rounded-full border border-border bg-background px-3 py-1 text-[10px] font-semibold text-foreground transition hover:border-primary/40">
                  ★ {b.title}
                </button>
              ))}
            </div>
          </>
        )}

        <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Quick links</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quick.map((k) => (
            <button key={k.label} type="button" onClick={() => onGo(k.url)} className="rounded-full border border-border bg-background px-3 py-1 text-[10px] font-semibold text-foreground transition hover:border-primary/40">
              {k.label}
            </button>
          ))}
        </div>

        {history.length > 0 && (
          <>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Recent</p>
            <div className="mt-2 space-y-1">
              {history.slice(0, 5).map((h) => (
                <button key={`${h.url}-${h.title}`} type="button" onClick={() => onGo(h.url)} className="block w-full truncate rounded-lg px-2 py-1 text-left text-[10px] text-muted-foreground transition hover:bg-secondary hover:text-foreground">
                  {h.title || hostOf(h.url)} — {h.url}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
