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
 *  GET/POST /api/browse?tab=<tabId>&u=<url-encoded-target>
 *
 *  • HTML → rewritten (links/assets/forms → proxy) + copilot-inject.js added
 *  • CSS → url()/@import rewritten
 *  • everything else → streamed through with original content-type
 *  • cookies kept per-tab in memory (logins work inside a session)
 *  • CSP / X-Frame-Options stripped so pages render in the iframe
 */

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const MAX_HTML_BYTES = 15 * 1024 * 1024;

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
    if (host === jarHost || host.endsWith(`.${jarHost}`)) {
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

function makeProx(tab: string, finalUrl: string) {
  return (raw: string | undefined): string | undefined => {
    if (!raw) return raw;
    const val = String(raw).trim();
    if (!val || SKIP_RE.test(val)) return raw;
    try {
      const abs = new URL(val, finalUrl).toString();
      if (!abs.startsWith("http")) return raw;
      return `/api/browse?tab=${encodeURIComponent(tab)}&u=${encodeURIComponent(abs)}`;
    } catch {
      return raw;
    }
  };
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

function errorPage(title: string, detail: string, target: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Co-Pilot — ${title}</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#0d1126;color:#e6e9f4;
       display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{max-width:520px;padding:28px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}
  h1{font-size:18px;margin:0 0 8px}p{font-size:13px;line-height:1.6;color:#b7bdd4;margin:0 0 14px}
  a{color:#8b93ff;font-weight:600;text-decoration:none}
  .btn{display:inline-block;margin-top:6px;padding:8px 14px;border-radius:10px;background:#6366f1;color:#fff;font-size:13px}
</style></head><body><div class="card">
<h1>${title}</h1><p>${detail}</p>
<p>The Co-Pilot still has your documents, answers and checklist — nothing is lost.</p>
<a class="btn" href="${target}" target="_blank" rel="noopener noreferrer">Open this site directly in a new tab ↗</a>
</div></body></html>`;
}

// ── HTML transform ───────────────────────────────────────────────────
function transformHtml(html: string, tab: string, finalUrl: string): string {
  const prox = makeProx(tab, finalUrl);
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
      const p = prox(val);
      if (p) $(el).attr(attr, p);
    });
  }
  $("[srcset]").each((_, el) => {
    const val = $(el).attr("srcset");
    if (val) $(el).attr("srcset", rewriteSrcset(val, prox));
  });
  $("[style]").each((_, el) => {
    const val = $(el).attr("style");
    if (val && val.includes("url(")) $(el).attr("style", rewriteCssUrls(val, prox));
  });
  $("style").each((_, el) => {
    const val = $(el).html();
    if (val && val.includes("url(")) $(el).html(rewriteCssUrls(val, prox));
  });

  // keep top-level navigation inside our tab (handled by injected script)
  $("a[target='_blank'], a[target=_blank]").removeAttr("target");

  // inject the co-pilot helper
  const inject = `<script src="/copilot-inject.js" data-sg-final="${finalUrl.replace(/"/g, "&quot;")}" data-sg-tab="${tab}"></script>`;
  const head = $("head");
  if (head.length) head.prepend(inject);
  else $("html").prepend(inject);

  return $.html();
}

// ── shared fetch+serve ───────────────────────────────────────────────
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
      errorPage("Address not allowed", "The Co-Pilot Browser can only open http(s) web pages.", "https://www.google.com"),
      { status: 400, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  let body: ArrayBuffer | undefined;
  if (method === "POST") body = await req.arrayBuffer();

  const host = target.hostname;
  const headers: Record<string, string> = {
    "user-agent": UA,
    "accept-language": "en-US,en;q=0.9",
    accept: "*/*",
  };
  const cookie = cookiesFor(tab, host);
  if (cookie) headers.cookie = cookie;
  if (method === "POST") {
    const ct = req.headers.get("content-type");
    if (ct) headers["content-type"] = ct;
  }

  let res: Response;
  try {
    res = await fetch(target.toString(), {
      method,
      headers,
      body: method === "POST" ? body : undefined,
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    return new NextResponse(
      errorPage(
        "This site did not respond",
        `${host} timed out or refused the connection — it may block automated access or be temporarily down.`,
        target.toString()
      ),
      { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
    );
  }

  const finalUrl = res.url || target.toString();
  try {
    const getter = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
    if (typeof getter === "function") storeCookies(tab, new URL(finalUrl).hostname, getter.call(res.headers));
  } catch {
    /* ignore cookie errors */
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const baseHeaders: Record<string, string> = {
    "cache-control": "no-store",
    "x-sg-final-url": finalUrl,
  };

  // HTML → transform
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
      const out = transformHtml(html, tab, finalUrl);
      return new NextResponse(out, {
        status: res.status,
        headers: { ...baseHeaders, "content-type": "text/html; charset=utf-8" },
      });
    } catch {
      return new NextResponse(
        errorPage("This page could not be prepared", `${host} sent a page the Co-Pilot could not read.`, finalUrl),
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
        status: res.status,
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
  return new NextResponse(res.body, { status: res.status, headers: pass });
}

export async function GET(req: NextRequest) {
  return serve(req, "GET");
}

export async function POST(req: NextRequest) {
  return serve(req, "POST");
}
