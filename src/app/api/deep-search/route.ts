import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CachedSearch {
  timestamp: number;
  results: WebResult[];
}
interface WebResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  date?: string;
  favicon?: string;
}

const cache = new Map<string, CachedSearch>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * POST /api/deep-search
 * Body: { origin, destination, level, field }
 * Runs multiple crafted live web searches and returns aggregated results.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const origin: string = body.origin || "Ghana";
    const destination: string = body.destination && body.destination !== "all" ? body.destination : "worldwide";
    const level: string = body.level && body.level !== "all" ? body.level : "";
    const field: string = body.field && body.field !== "any" ? body.field : "";

    const levelWord = level ? level : "bachelors masters PhD";
    const fieldWord = field ? field : "";

    // Craft 3 deep queries like a real applicant would search
    const queries = [
      `fully funded scholarships ${new Date().getFullYear()}-${new Date().getFullYear() + 1} for ${origin} students ${levelWord} ${fieldWord} ${destination} no application fee`.replace(/\s+/g, " ").trim(),
      `${origin} students eligible scholarships ${destination} ${levelWord} ${fieldWord} application fee waived IELTS waiver medium of instruction`.replace(/\s+/g, " ").trim(),
      `universities ${destination} free application fee international students ${levelWord} ${fieldWord} ${new Date().getFullYear()}`.replace(/\s+/g, " ").trim(),
    ];

    const key = JSON.stringify(queries);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ results: cached.results, cached: true, queries });
    }

    const zai = await ZAI.create();
    const settled = await Promise.allSettled(
      queries.map((query) => zai.functions.invoke("web_search", { query, num: 10 }))
    );

    const seen = new Set<string>();
    const results: WebResult[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled" && Array.isArray(s.value)) {
        for (const item of s.value) {
          if (!item?.url || seen.has(item.url)) continue;
          seen.add(item.url);
          results.push({
            url: item.url,
            name: item.name ?? "",
            snippet: item.snippet ?? "",
            host_name: item.host_name ?? "",
            date: item.date,
            favicon: item.favicon,
          });
        }
      }
    }

    // Rank: scholarship/official-sounding domains first
    const officialHint = /(edu|gov|ac\.|scholarship|daad|chevening|erasmus|campusfrance|csc|vfoundation|foundation|university|ox|cam)/i;
    results.sort((a, b) => {
      const ao = officialHint.test(a.host_name) ? 0 : 1;
      const bo = officialHint.test(b.host_name) ? 0 : 1;
      return ao - bo;
    });

    const trimmed = results.slice(0, 30);
    cache.set(key, { timestamp: Date.now(), results: trimmed });

    return NextResponse.json({ results: trimmed, cached: false, queries });
  } catch (error) {
    console.error("deep-search error:", error);
    return NextResponse.json(
      { error: "Deep search temporarily unavailable. The curated database results below remain fully available.", results: [] },
      { status: 200 }
    );
  }
}
