import { PrismaClient } from "@prisma/client";
import { SeedOpportunity, csvLevels, csvFields } from "../src/lib/seed-types";
import { EUROPE_SEED_1 } from "../src/lib/seed-europe-1";
import { EUROPE_SEED_2 } from "../src/lib/seed-europe-2";
import { ASIA_ME_SEED } from "../src/lib/seed-asia-me";
import { AMERICAS_AFRICA_OCEANIA_SEED } from "../src/lib/seed-americas-africa-oceania";
import { UNIS_EUROPE_1 } from "../src/lib/seed-unis-europe-1";
import { UNIS_EUROPE_2 } from "../src/lib/seed-unis-europe-2";
import { UNIS_WORLD_1 } from "../src/lib/seed-unis-world-1";
import { UNIS_WORLD_2 } from "../src/lib/seed-unis-world-2";
import { EXTRA_SCHOLARSHIPS } from "../src/lib/seed-extra-scholarships";
import { ONLINE_SEED } from "../src/lib/seed-online";
import { CERTS_SEED } from "../src/lib/seed-certs";
import { EXISTING_SLUGS, RELATED_PATCH } from "../src/lib/seed-links";

const db = new PrismaClient();

const ALL: SeedOpportunity[] = [
  ...EUROPE_SEED_1,
  ...EUROPE_SEED_2,
  ...ASIA_ME_SEED,
  ...AMERICAS_AFRICA_OCEANIA_SEED,
  ...UNIS_EUROPE_1,
  ...UNIS_EUROPE_2,
  ...UNIS_WORLD_1,
  ...UNIS_WORLD_2,
  ...EXTRA_SCHOLARSHIPS,
  ...ONLINE_SEED,
  ...CERTS_SEED,
];

/** kebab-case slug from a name (fallback when no explicit slug/slug-map entry) */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\u2014\u2013]/g, "-") // em/en dash → dash
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

/** Build slug for every entry + slug lookup map */
function resolveSlug(op: SeedOpportunity): string {
  return op.slug ?? EXISTING_SLUGS[op.name] ?? slugify(op.name);
}

/** Merge inline `related` with RELATED_PATCH; make every relation bidirectional */
function buildRelations(): Map<string, Set<string>> {
  const rel = new Map<string, Set<string>>();
  const slugOf = new Map<string, string>();
  for (const op of ALL) slugOf.set(op.name, resolveSlug(op));

  const add = (a: string, b: string) => {
    if (a === b) return;
    if (!rel.has(a)) rel.set(a, new Set());
    if (!rel.has(b)) rel.set(b, new Set());
    rel.get(a)!.add(b);
    rel.get(b)!.add(a);
  };

  // 1. inline relations from new entries
  for (const op of ALL) {
    const me = slugOf.get(op.name)!;
    for (const r of op.related ?? []) add(me, r);
  }
  // 2. patch for original entries
  for (const [slug, related] of Object.entries(RELATED_PATCH)) {
    for (const r of related) add(slug, r);
  }
  return rel;
}

async function main() {
  const relations = buildRelations();
  console.log(`Seeding ${ALL.length} opportunities...`);
  let i = 0;
  for (const op of ALL) {
    const slug = resolveSlug(op);
    const related = Array.from(relations.get(slug) ?? []);
    const data = {
      name: op.name,
      slug,
      kind: op.kind,
      provider: op.provider,
      country: op.country,
      countryCode: op.countryCode,
      continent: op.continent,
      city: op.city ?? null,
      lat: op.lat,
      lng: op.lng,
      levels: csvLevels(op.levels),
      fields: csvFields(op.fields),
      feeAmount: op.feeAmount,
      feeCurrency: op.feeCurrency,
      feeConfirmedFree: op.feeConfirmedFree,
      feeUsdApprox: op.feeUsdApprox ?? (op.feeConfirmedFree ? 0 : null),
      feeNote: op.feeNote ?? null,
      relatedSlugs: related.join(","),
      fundingType: op.fundingType,
      fundingNote: op.fundingNote ?? null,
      opensMonth: op.opensMonth ?? null,
      opensDay: op.opensDay ?? null,
      closesMonth: op.closesMonth ?? null,
      closesDay: op.closesDay ?? null,
      rolling: op.rolling ?? false,
      cycleNote: op.cycleNote ?? null,
      moiAccepted: op.moiAccepted,
      moiNote: op.moiNote ?? null,
      englishTests: op.englishTests ?? null,
      localLanguageRequired: op.localLanguageRequired,
      localLanguageNote: op.localLanguageNote ?? null,
      recommendationsRequired: op.recommendationsRequired,
      recommendationsCount: op.recommendationsCount ?? null,
      recommendationsNote: op.recommendationsNote ?? null,
      unofficialTranscripts: op.unofficialTranscripts,
      transcriptsNote: op.transcriptsNote ?? null,
      essayRequired: op.essayRequired,
      essayNote: op.essayNote ?? null,
      applicationSteps: JSON.stringify(op.applicationSteps),
      requirementsSummary: op.requirementsSummary ?? null,
      eligibilityNote: op.eligibilityNote ?? null,
      officialUrl: op.officialUrl,
      competitiveNote: op.competitiveNote ?? null,
      successTips: op.successTips ?? null,
    };
    await db.opportunity.upsert({
      where: { name: op.name },
      update: data,
      create: data,
    });
    i++;
  }
  console.log(`Done. ${i} opportunities in database.`);

  const linked = await db.opportunity.count({ where: { relatedSlugs: { not: "" } } });
  console.log(`Linked (university↔scholarship): ${linked} entries with relations.`);

  const byKind = await db.opportunity.groupBy({ by: ["kind"], _count: { _all: true } });
  for (const k of byKind) console.log(`  ${k.kind}: ${k._count._all}`);
  const counts = await db.opportunity.groupBy({ by: ["continent"], _count: { _all: true } });
  for (const c of counts) console.log(`  ${c.continent}: ${c._count._all}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
