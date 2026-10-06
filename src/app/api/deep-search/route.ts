import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface CachedSearch {
  timestamp: number;
  payload: DeepSearchPayload;
}
interface WebResult {
  url: string;
  name: string;
  snippet: string;
  host_name: string;
  date?: string;
  favicon?: string;
  feeMention?: boolean;
  freeMention?: boolean;
}
interface DeepSearchPayload {
  results: WebResult[];
  queries: string[];
  synthesis?: string | null;
}

const cache = new Map<string, CachedSearch>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const FEE_RE = /(\$\s?\d[\d,.]*|\d+\s?(EUR|€|USD|CHF|SEK|NOK|PLN|CZK|ZAR|SGD|RM|BRL|TRY|MYR)|fee\s*(of|is|:)?\s*\d)/i;
const FREE_RE = /(no application fee|application fee (is )?(waived|free)|free (to )?apply|without (an )?application fee|\$0 (application )?fee|fee[- ]waiv)/i;

/**
 * POST /api/deep-search
 * Body: { origin, destination, level, field }
 * Runs 4 crafted live web searches, tags fee signals on every result,
 * and produces an AI briefing of what it means for the applicant.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const origin: string = body.origin || "Ghana";
    const destination: string = body.destination && body.destination !== "all" ? body.destination : "worldwide";
    const level: string = body.level && body.level !== "all" ? body.level : "";
    const field: string = body.field && body.field !== "any" ? body.field : "";

    const levelWord = level || "bachelors masters PhD";
    const fieldWord = field || "";
    const year = new Date().getFullYear();
    const nextYear = year + 1;

    // 4 crafted deep queries — like a real applicant + a fee hunter + a waiver hunter
    const queries = [
      `fully funded scholarships ${year}-${nextYear} for ${origin} students ${levelWord} ${fieldWord} ${destination} no application fee`.replace(/\s+/g, " ").trim(),
      `${origin} students eligible scholarships ${destination} ${levelWord} ${fieldWord} application deadline open now ${year}`.replace(/\s+/g, " ").trim(),
      `universities ${destination} application fee below 30 USD OR free application fee international students ${levelWord} ${fieldWord} ${year}`.replace(/\s+/g, " ").trim(),
      `${origin} medium of instruction WAEC IELTS waiver university admission english test not required ${destination}`.replace(/\s+/g, " ").trim(),
    ];

    const key = JSON.stringify(queries);
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({ ...cached.payload, cached: true });
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
          const text = `${item.name ?? ""} ${item.snippet ?? ""}`;
          results.push({
            url: item.url,
            name: item.name ?? "",
            snippet: item.snippet ?? "",
            host_name: item.host_name ?? "",
            date: item.date,
            favicon: item.favicon,
            feeMention: FEE_RE.test(text),
            freeMention: FREE_RE.test(text),
          });
        }
      }
    }

    // Rank: official domains first, then free/waiver mentions, then fee mentions
    const officialHint = /(edu|gov|ac\.|scholarship|daad|chevening|erasmus|campusfrance|csc|foundation|university|ox|cam|stipendium|mis\b|mtcp|nus|ntu|epfl|helsinki|uzh|ethz)/i;
    results.sort((a, b) => {
      const ao = (officialHint.test(a.host_name) ? 0 : 2) + (a.freeMention ? -1 : 0) + (a.feeMention ? 0.5 : 0);
      const bo = (officialHint.test(b.host_name) ? 0 : 2) + (b.freeMention ? -1 : 0) + (b.feeMention ? 0.5 : 0);
      return ao - bo;
    });

    const trimmed = results.slice(0, 30);

    // AI briefing — what the results mean for this applicant (fails soft)
    let synthesis: string | null = null;
    try {
      const context = trimmed
        .slice(0, 12)
        .map((r) => `- ${r.name} (${r.host_name}): ${r.snippet.slice(0, 220)}`)
        .join("\n");
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "assistant",
            content:
              "You are an expert international scholarship advisor. Write a tight, concrete briefing (max 110 words, plain text, no markdown headers) telling this student: which programmes from the results look open right now, which mention free or low application fees (below $30), and the 2-3 most useful next actions. Flag anything uncertain as 'verify on the official page'.",
          },
          {
            role: "user",
            content: `Student profile: from ${origin}; level ${levelWord || "any"}; field ${fieldWord || "any"}; destination ${destination}.\nLive search results:\n${context}`,
          },
        ],
        thinking: { type: "disabled" },
      });
      synthesis = completion.choices[0]?.message?.content?.trim() || null;
    } catch (e) {
      console.error("deep-search synthesis failed (non-fatal):", e);
    }

    const payload: DeepSearchPayload = { results: trimmed, queries, synthesis };
    cache.set(key, { timestamp: Date.now(), payload });

    return NextResponse.json({ ...payload, cached: false });
  } catch (error) {
    console.error("deep-search error:", error);
    return NextResponse.json(
      { error: "Deep search temporarily unavailable. The curated database results below remain fully available.", results: [], queries: [], synthesis: null },
      { status: 200 }
    );
  }
}
