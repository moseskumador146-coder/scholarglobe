import { PrismaClient } from "@prisma/client";
import { SeedOpportunity, csvLevels, csvFields } from "../src/lib/seed-types";
import { EUROPE_SEED_1 } from "../src/lib/seed-europe-1";
import { EUROPE_SEED_2 } from "../src/lib/seed-europe-2";
import { ASIA_ME_SEED } from "../src/lib/seed-asia-me";
import { AMERICAS_AFRICA_OCEANIA_SEED } from "../src/lib/seed-americas-africa-oceania";

const db = new PrismaClient();

const ALL: SeedOpportunity[] = [
  ...EUROPE_SEED_1,
  ...EUROPE_SEED_2,
  ...ASIA_ME_SEED,
  ...AMERICAS_AFRICA_OCEANIA_SEED,
];

async function main() {
  console.log(`Seeding ${ALL.length} opportunities...`);
  let i = 0;
  for (const op of ALL) {
    const data = {
      name: op.name,
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
      feeNote: op.feeNote ?? null,
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
  const counts = await db.opportunity.groupBy({
    by: ["continent"],
    _count: { _all: true },
  });
  for (const c of counts) {
    console.log(`  ${c.continent}: ${c._count._all}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
