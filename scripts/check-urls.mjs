// Check every officialUrl in the DB for staleness (HTTP status + redirect target).
// Usage: node scripts/check-urls.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

async function check(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": UA, Accept: "text/html,*/*" },
    });
    clearTimeout(t);
    const finalUrl = res.url;
    return { status: res.status, finalUrl, ok: res.ok };
  } catch (e) {
    clearTimeout(t);
    return { status: 0, finalUrl: url, ok: false, error: String(e).slice(0, 120) };
  }
}

const ops = await prisma.opportunity.findMany({
  select: { slug: true, name: true, officialUrl: true },
  orderBy: { slug: "asc" },
});

console.log(`Checking ${ops.length} URLs...\n`);
const bad = [];
for (const op of ops) {
  const r = await check(op.officialUrl);
  const tag = r.ok ? (r.finalUrl !== op.officialUrl ? "REDIRECT" : "OK") : "FAIL";
  if (tag !== "OK") {
    bad.push({ slug: op.slug, name: op.name, tag, status: r.status, from: op.officialUrl, to: r.finalUrl, error: r.error });
  }
  console.log(`${tag.padEnd(8)} ${r.status} ${op.slug} ${tag === "REDIRECT" ? "-> " + r.finalUrl : ""} ${r.error ?? ""}`);
}

console.log(`\n=== ${bad.length} issue(s) ===`);
for (const b of bad) console.log(`${b.tag} ${b.status} ${b.slug}\n   from: ${b.from}\n   to:   ${b.to} ${b.error ?? ""}`);
