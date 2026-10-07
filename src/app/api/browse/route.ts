import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const runtime = "nodejs";

/**
 * Co-Pilot Browser proxy — serves any external page same-origin so the
 * in-app browser can render it in an iframe AND the Co-Pilot can read the
 * screen, autofill profile data, and flag CAPTCHAs/payments/uploads.
 *
 *  GET/POST /api/browse?tab=<tabId>&u=<url-encoded-target>&d=<dest>
 *
 *  • HTML → rewritten (links/assets/forms → proxy) + copilot-inject.js added
 *  • CSS → url()/@import rewritten
 *  • everything else → streamed through with original content-type
 *  • cookies kept per-tab in memory — captured on EVERY redirect hop, so
 *    login flows (POST → 302 Set-Cookie → 200) survive
 *  • browser-like header set (sec-ch-ua / sec-fetch-*) per resource dest —
 *    many bot-walls score these headers
 *  • CSP / X-Frame-Options stripped so pages render in the iframe
 *  • bot-challenge responses (Cloudflare etc.) are replaced by a friendly
 *    "open directly" page the app detects and surfaces as an overlay
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAX_HTML_BYTES = 15 * 1024 * 1024;
const MAX_HOPS = 10;
const FETCH_TIMEOUT = 30_000;

// ── per-tab cookie jar (lives with the server process) ───────────────
const JARS = new Map<string, Map<string, Map<string, string>>>(); // tabId -> host -> name -> value

function jarFor(tab: string): Map<string, Map<string, string>> {
  let jar = JARS.get(tab);
  if (!jar) {
    jar = new Map();
    JARS.set(tab, jar);
    if (JARS.size > 60) {
      // keep memory bounded — drop the oldest tab jar
      const first = JARS.keys().next().value;
      if (first) JARS.delete(first);
    }
  }
  return jar;
}

function cookiesFor(tab: string, host: string): string {
  const jar = jarFor(tab);
  const parts: string[] = [];
  for (const [jarHost, cookies] of jar.entries()) {
    if (host === jarHost || host.endsWith(`.${jarHost}`) || jarHost.endsWith(`.${host}`)) {
      for (const [name, value] of cookies.entries()) parts.push(`${name}=${value}`);
    }
  }
  return parts.join("; ");
}

function storeCookies(tab: string, host: string, setCookies: string[]) {
  if (!setCookies.length) return;
  const jar = jarFor(tab);
  let bucket = jar.get(host);
  if (!bucket) {
    bucket = new Map();
    jar.set(host, bucket);
  }
  for (const raw of setCookies) {
    const first = raw.split(";")[0];
    const eq = first.indexOf("=");
    if (eq > 0) {
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (name) bucket.set(name, value);
    }
  }
}

function getSetCookies(res: Response): string[] {
  try {
    const getter = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getter === "function") return getter.call(res.headers);
  } catch {
    /* ignore */
  }
  const one = res.headers.get("set-cookie");
  return one ? [one] : [];
}

// ── SSRF guard ───────────────────────────────────────────────────────
const BLOCKED_HOST =
  /^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?|\[?fc00|\[?fdfe|.*\.local)$/i;

function safeTarget(raw: string): URL | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (BLOCKED_HOST.test(u.hostname)) return null;
    return u;
  } catch {
    return null;
  }
}

// ── URL → proxy rewriting ────────────────────────────────────────────
const SKIP_RE = /^(data:|javascript:|mailto:|tel:|blob:|about:|#)/i;

interface ElLike {
  tagName: string;
  attribs: Record<string, string>;
}

function makeProx(tab: string, finalUrl: string, dest?: string) {
  return (raw: string | undefined): string | undefined => {
    if (!raw) return raw;
    const val = String(raw).trim();
    if (!val || SKIP_RE.test(val)) return raw;
    try {
      const abs = new URL(val, finalUrl).toString();
      if (!abs.startsWith("http")) return raw;
      const sp = new URLSearchParams({ tab, u: abs });
      if (dest) sp.set("d", dest);
      return `/api/browse?${sp.toString()}`;
    } catch {
      return raw;
    }
  };
}

/** per-attribute destination used for realistic sec-fetch-* headers */
function destForTag(tag: string, attr: string, el: ElLike): string | undefined {
  if (tag === "script" && attr === "src") return "script";
  if (tag === "link" && attr === "href") {
    const rel = (el.attribs["rel"] || "").toLowerCase();
    if (rel.includes("stylesheet")) return "style";
    if (rel.includes("icon") || rel.includes("manifest")) return "image";
    return undefined;
  }
  if ((tag === "img" || tag === "source" || tag === "embed") && attr === "src") return "image";
  if ((tag === "video" || tag === "audio") && (attr === "src" || attr === "poster")) return "media";
  if (tag === "iframe" && attr === "src") return "document";
  return undefined;
}

function rewriteSrcset(srcset: string, prox: (u: string) => string | undefined): string {
  return srcset
    .split(",")
    .map((part) => {
      const seg = part.trim();
      if (!seg) return "";
      const sp = seg.search(/\s/);
      const url = sp === -1 ? seg : seg.slice(0, sp);
      const rest = sp === -1 ? "" : seg.slice(sp);
      const p = prox(url);
      return `${p ?? url}${rest}`;
    })
    .filter(Boolean)
    .join(", ");
}

function rewriteCssUrls(css: string, prox: (u: string) => string | undefined): string {
  return css
    .replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (m, q, u) => {
      const p = prox(u);
      return p ? `url(${q}${p}${q})` : m;
    })
    .replace(/@import\s+(['"])([^'"]+)\1/gi, (m, q, u) => {
      const p = prox(u);
      return p ? `@import ${q}${p}${q}` : m;
    });
}

function detectCharset(buffer: Buffer, contentType: string): string {
  const m = /charset=["']?([\w-]+)/i.exec(contentType);
  if (m) return m[1].toLowerCase();
  const head = buffer.subarray(0, 2048).toString("latin1");
  const meta = /<meta[^>]+charset=["']?([\w-]+)/i.exec(head) || /charset=["']?([\w-]+)/i.exec(head);
  return meta ? meta[1].toLowerCase() : "utf-8";
}

// ── bot-challenge detection ──────────────────────────────────────────
// Strict markers — safe to match even on 200 pages.
const CHALLENGE_RE =
  /just a moment|__cf_chl|challenge-platform|cf-browser-verification|attention required|incapsula|datadome|captcha-delivery|perimeterx|px-captcha|kasada|sucuri cloudproxy/i;
// Denial phrases — only trusted on 403/429-class statuses to avoid false positives.
const DENIAL_RE = /access denied|you don'?t have permission|forbidden/i;

function isChallenge(status: number, body: string): boolean {
  if (status === 403 || status === 429) {
    return CHALLENGE_RE.test(body.slice(0, 8000)) || DENIAL_RE.test(body.slice(0, 2000));
  }
  if (status === 503) return true;
  if (status === 200) return CHALLENGE_RE.test(body.slice(0, 4000));
  return false;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function errorPage(title: string, detail: string, target: string): string {
  const retry = `/api/browse?u=${encodeURIComponent(target)}&cb=${Date.now()}`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>Co-Pilot — ${esc(title)}</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0d1126;color:#e6e9f4;
       display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{max-width:540px;padding:28px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
  h1{font-size:18px;margin:0 0 8px}p{font-size:13px;line-height:1.6;color:#b7bdd4;margin:0 0 14px}
  a{color:#8b93ff;font-weight:600;text-decoration:none}
  .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px}
  .btn{display:inline-block;padding:9px 15px;border-radius:10px;background:#6366f1;color:#fff;font-size:13px}
  .btn2{display:inline-block;padding:9px 15px;border-radius:10px;background:rgba(255,255,255,.1);color:#e6e9f4;font-size:13px}
</style></head><body><div class="card">
<div id="sg-err" data-sg-real="${esc(target)}" data-sg-title="${esc(title)}"></div>
<h1>${esc(title)}</h1><p>${esc(detail)}</p>
<p>The Co-Pilot still has your documents, answers and checklist — nothing is lost.</p>
<div class="row">
<a class="btn" href="${esc(target)}" target="_blank" rel="noopener noreferrer">Open site directly ↗</a>
<a class="btn2" href="${esc(retry)}">Try again</a>
</div>
</div></body></html>`;
}

// ── HTML transform ───────────────────────────────────────────────────
function transformHtml(html: string, tab: string, finalUrl: string): string {
  const $ = cheerio.load(html);

  // drop constructs that break proxying
  $("base").remove();
  $("meta[http-equiv]").each((_, el) => {
    const he = ($(el).attr("http-equiv") || "").toLowerCase();
    if (he === "content-security-policy" || he === "refresh") $(el).remove();
  });
  $("[integrity]").removeAttr("integrity");
  $("[nonce]").removeAttr("nonce");

  const ATTRS = ["href", "src", "action", "formaction", "poster", "data-src", "data-href", "data-url", "data-background"];
  for (const attr of ATTRS) {
    $(`[${attr}]`).each((_, el) => {
      const val = $(el).attr(attr);
      if (!val) return;
      const elLike = el as unknown as ElLike;
      const dest = destForTag(elLike.tagName.toLowerCase(), attr, elLike);
      const p = makeProx(tab, finalUrl, dest)(val);
      if (p) $(el).attr(attr, p);
    });
  }
  $("[srcset]").each((_, el) => {
    const val = $(el).attr("srcset");
    if (val) $(el).attr("srcset", rewriteSrcset(val, makeProx(tab, finalUrl, "image")));
  });
  $("[style]").each((_, el) => {
    const val = $(el).attr("style");
    if (val && val.includes("url(")) $(el).attr("style", rewriteCssUrls(val, makeProx(tab, finalUrl)));
  });
  $("style").each((_, el) => {
    const val = $(el).html();
    if (val && val.includes("url(")) $(el).html(rewriteCssUrls(val, makeProx(tab, finalUrl)));
  });

  // keep top-level navigation inside our tab (handled by injected script);
  // anchors the page itself marks external stay untouched
  $("a[target='_blank'], a[target=_blank]").each((_, el) => {
    if (!$(el).hasClass("sg-external")) $(el).removeAttr("target");
  });

  // inject the co-pilot helper
  const inject = `<script src="/copilot-inject.js" data-sg-final="${finalUrl.replace(/"/g, "&quot;")}" data-sg-tab="${tab}"></script>`;
  const head = $("head");
  if (head.length) head.prepend(inject);
  else $("html").prepend(inject);

  return $.html();
}

// ── per-dest browser-like headers ────────────────────────────────────
function headersFor(dest: string | null, target: URL, cookie: string, method: "GET" | "POST", req: NextRequest): Record<string, string> {
  const isDoc = dest === "document" || dest === null;
  const h: Record<string, string> = {
    "user-agent": UA,
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    referer: `${target.protocol}//${target.hostname}/`,
  };
  if (isDoc) {
    h.accept =
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7";
    h["sec-fetch-dest"] = "document";
    h["sec-fetch-mode"] = "navigate";
    h["sec-fetch-site"] = "none";
    h["sec-fetch-user"] = "?1";
    h["upgrade-insecure-requests"] = "1";
  } else if (dest === "script") {
    h.accept = "*/*";
    h["sec-fetch-dest"] = "script";
    h["sec-fetch-mode"] = "no-cors";
    h["sec-fetch-site"] = "same-origin";
  } else if (dest === "style") {
    h.accept = "text/css,*/*;q=0.1";
    h["sec-fetch-dest"] = "style";
    h["sec-fetch-mode"] = "no-cors";
    h["sec-fetch-site"] = "same-origin";
  } else if (dest === "image") {
    h.accept = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
    h["sec-fetch-dest"] = "image";
    h["sec-fetch-mode"] = "no-cors";
    h["sec-fetch-site"] = "same-origin";
  } else {
    h.accept = "*/*";
    if (dest) h["sec-fetch-dest"] = dest;
    h["sec-fetch-mode"] = "no-cors";
    h["sec-fetch-site"] = "same-origin";
  }
  // runtime fetch()/XHR from the injected patch — real CORS-style request
  if (req.headers.get("x-sg-fetch")) {
    h["sec-fetch-dest"] = "empty";
    h["sec-fetch-mode"] = "cors";
    h["sec-fetch-site"] = "same-origin";
    h.accept = req.headers.get("accept") || "*/*";
  }
  if (cookie) h.cookie = cookie;
  if (method === "POST") {
    const ct = req.headers.get("content-type");
    if (ct) h["content-type"] = ct;
  }
  return h;
}

// ── shared fetch+serve (manual redirect loop keeps every hop's cookies) ──
async function serve(req: NextRequest, method: "GET" | "POST") {
  const sp = req.nextUrl.searchParams;
  const tab = (sp.get("tab") || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || "default";
  const action = sp.get("action");

  if (action === "clear") {
    JARS.delete(tab);
    return NextResponse.json({ ok: true, cleared: tab });
  }

  const targetRaw = sp.get("u") || "";
  const target = safeTarget(targetRaw);
  if (!target) {
    return new NextResponse(
      errorPage("Address not allowed", "The Co-Pilot Browser can only open http(s) web pages.", "https://duckduckgo.com/"),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const destParam = sp.get("d") || (req.headers.get("x-sg-fetch") ? "fetch" : null);
  let body: ArrayBuffer | undefined;
  if (method === "POST") body = await req.arrayBuffer();

  const started = Date.now();
  let currentUrl = target.toString();
  let currentMethod = method;
  let currentBody: ArrayBuffer | undefined = body;
  let res: Response | null = null;

  try {
    for (let hop = 0; hop < MAX_HOPS; hop++) {
      const u = safeTarget(currentUrl);
      if (!u) {
        return new NextResponse(
          errorPage("Redirect not allowed", "The site tried to redirect to a non-web address.", target.toString()),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
        );
      }
      const ck = cookiesFor(tab, u.hostname);
      const hopHeaders = headersFor(destParam, u, ck, currentMethod, req);
      res = await fetch(u.toString(), {
        method: currentMethod,
        headers: hopHeaders,
        body: currentMethod !== "POST" ? undefined : currentBody,
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
      });
      const finalHost = u.hostname;
      try {
        const hops = getSetCookies(res);
        if (hops.length) storeCookies(tab, finalHost, hops);
      } catch {
        /* ignore cookie errors */
      }
      const st = res.status;
      if (st === 301 || st === 302 || st === 303 || st === 307 || st === 308) {
        const loc = res.headers.get("location");
        try {
          await res.arrayBuffer();
        } catch {
          /* drain */
        }
        if (!loc) break;
        const next = new URL(loc, u.toString()).toString();
        if (st === 307 || st === 308) {
          // keep method + body
        } else {
          currentMethod = "GET";
          currentBody = undefined;
        }
        currentUrl = next;
        if (Date.now() - started > 45_000) break;
        continue;
      }
      break;
    }
  } catch {
    return new NextResponse(
      errorPage(
        "This site did not respond",
        `${target.hostname} timed out or refused the connection — it may be temporarily down or may block access from server networks.`,
        target.toString()
      ),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
    );
  }
  if (!res) {
    return new NextResponse(
      errorPage("This site did not respond", `${target.hostname} could not be reached.`, target.toString()),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
    );
  }

  const finalUrl = res.url && res.url !== "" ? res.url : currentUrl;
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const baseHeaders: Record<string, string> = {
    "cache-control": "no-store",
    "x-sg-final-url": finalUrl,
  };
  const cdisp = res.headers.get("content-disposition");
  if (cdisp) baseHeaders["content-disposition"] = cdisp;

  // HTML → transform (or replace bot-challenges with a friendly page)
  if (contentType.includes("text/html") || contentType.includes("xhtml")) {
    try {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength > MAX_HTML_BYTES) throw new Error("too large");
      const charset = detectCharset(buf, contentType);
      let html: string;
      try {
        html = new TextDecoder(charset).decode(buf);
      } catch {
        html = buf.toString("utf-8");
      }
      if (isChallenge(res.status, html)) {
        return new NextResponse(
          errorPage(
            "This site blocks automated access",
            `${new URL(finalUrl).hostname} is protected by a bot-security wall (Cloudflare or similar) that only your own browser can pass. Open it directly — then use your Co-Pilot vault and answers alongside it.`,
            finalUrl
          ),
          { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
        );
      }
      const out = transformHtml(html, tab, finalUrl);
      return new NextResponse(out, {
        status: 200,
        headers: { ...baseHeaders, "content-type": "text/html; charset=utf-8" },
      });
    } catch {
      return new NextResponse(
        errorPage("This page could not be prepared", `${target.hostname} sent a page the Co-Pilot could not read.`, finalUrl),
        { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
      );
    }
  }

  // CSS → rewrite urls
  if (contentType.includes("text/css")) {
    try {
      const css = await res.text();
      const out = rewriteCssUrls(css, makeProx(tab, finalUrl));
      return new NextResponse(out, {
        status: 200,
        headers: { ...baseHeaders, "content-type": "text/css; charset=utf-8" },
      });
    } catch {
      return new NextResponse("", { status: 200, headers: { ...baseHeaders, "content-type": "text/css" } });
    }
  }

  // everything else → stream through
  const pass = new Headers();
  pass.set("content-type", contentType);
  const cl = res.headers.get("content-length");
  if (cl) pass.set("content-length", cl);
  pass.set("cache-control", "no-store");
  pass.set("x-sg-final-url", finalUrl);
  if (cdisp) pass.set("content-disposition", cdisp);
  return new NextResponse(res.body, { status: 200, headers: pass });
}

export async function GET(req: NextRequest) {
  return serve(req, "GET");
}

export async function POST(req: NextRequest) {
  return serve(req, "POST");
}
