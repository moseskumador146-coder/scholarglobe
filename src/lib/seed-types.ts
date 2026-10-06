export interface SeedStep {
  title: string;
  detail: string;
}

export interface SeedOpportunity {
  name: string;
  slug?: string; // stable id for uni↔scholarship linking (auto-slugified from name if omitted)
  kind: "SCHOLARSHIP" | "UNIVERSITY" | "ONLINE_DEGREE" | "CERTIFICATE";
  provider: string;
  country: string;
  countryCode: string; // ISO2 lowercase
  continent: "Africa" | "Europe" | "Asia" | "Middle East" | "North America" | "South America" | "Oceania";
  city?: string;
  lat: number;
  lng: number;
  levels: Array<"undergraduate" | "masters" | "phd" | "certificate">;
  fields: string[]; // ["any"] = all fields
  feeAmount: number;
  feeCurrency: string;
  feeConfirmedFree: boolean;
  feeUsdApprox?: number; // rough USD equivalent for the ≤$30 low-fee filter
  feeNote?: string;
  /** Slugs of linked opposite-kind opportunities (university ↔ scholarship pairs) */
  related?: string[];
  fundingType: "FULLY_FUNDED" | "PARTIAL" | "NO_TUITION" | "SELF_FUNDED";
  fundingNote?: string;
  opensMonth?: number;
  opensDay?: number;
  closesMonth?: number;
  closesDay?: number;
  rolling?: boolean;
  cycleNote?: string;
  moiAccepted: boolean;
  moiNote?: string;
  englishTests?: string;
  localLanguageRequired: boolean;
  localLanguageNote?: string;
  recommendationsRequired: boolean;
  recommendationsCount?: number;
  recommendationsNote?: string;
  unofficialTranscripts: boolean;
  transcriptsNote?: string;
  essayRequired: boolean;
  essayNote?: string;
  applicationSteps: SeedStep[];
  requirementsSummary?: string;
  eligibilityNote?: string;
  officialUrl: string;
  competitiveNote?: string;
  successTips?: string;
}

export const FIELDS = [
  "any",
  "engineering",
  "computer science",
  "medicine & health",
  "natural sciences",
  "mathematics",
  "agriculture & food",
  "business & economics",
  "social sciences",
  "law",
  "education",
  "arts & humanities",
  "development studies",
  "public policy",
  "environment",
  "energy",
] as const;

export const LEVELS = ["undergraduate", "masters", "phd", "certificate"] as const;

export function csvLevels(levels: SeedOpportunity["levels"]): string {
  return levels.join(",");
}

export function csvFields(fields: string[]): string {
  return fields.join("|");
}
