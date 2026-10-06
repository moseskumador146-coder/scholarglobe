import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface EssayRequest {
  op: {
    name: string;
    provider?: string;
    country?: string;
    kind?: string;
    fields?: string;
    levels?: string;
    fundingNote?: string | null;
    essayNote?: string | null;
    requirementsSummary?: string | null;
    successTips?: string | null;
  };
  profile: {
    fullName?: string;
    nationality?: string;
    highestDegree?: string;
    degreeInstitution?: string;
    field?: string;
    gpa?: string;
    careerGoal?: string;
    achievements?: string;
    englishStatus?: string;
  };
  kind: "sop" | "answers";
}

const cache = new Map<string, { draft: string; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

/**
 * POST /api/essay — Apply Co-Pilot AI drafting.
 * kind = "sop"     → full motivation letter draft tailored to the programme
 * kind = "answers" → paste-ready short answers for typical portal questions
 */
export async function POST(req: NextRequest) {
  try {
    const { op, profile, kind } = (await req.json()) as EssayRequest;
    if (!op?.name) {
      return NextResponse.json({ error: "Missing programme info." }, { status: 400 });
    }

    const key = `${kind}:${op.name}:${profile.fullName ?? ""}:${profile.nationality ?? ""}:${profile.careerGoal?.slice(0, 80) ?? ""}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      return NextResponse.json({ draft: hit.draft, cached: true });
    }

    const zai = await ZAI.create();

    const profileLine = [
      profile.fullName ? `Name: ${profile.fullName}` : "",
      profile.nationality ? `Nationality: ${profile.nationality}` : "",
      profile.highestDegree ? `Background: ${profile.highestDegree} at ${profile.degreeInstitution ?? "?"} (${profile.field ?? ""}, GPA ${profile.gpa ?? "n/a"})` : "",
      profile.careerGoal ? `Career goal: ${profile.careerGoal}` : "",
      profile.achievements ? `Achievements: ${profile.achievements}` : "",
      profile.englishStatus ? `English: ${profile.englishStatus === "moi" ? "English-medium education (MOI waiver claimed)" : profile.englishStatus}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const opLine = [
      `Programme: ${op.name}`,
      op.provider ? `Provider: ${op.provider}` : "",
      op.country ? `Country: ${op.country}` : "",
      op.kind ? `Type: ${op.kind === "SCHOLARSHIP" ? "scholarship application" : "university application"}` : "",
      op.levels ? `Level: ${op.levels}` : "",
      op.fields ? `Field: ${op.fields}` : "",
      op.fundingNote ? `Funding: ${op.fundingNote}` : "",
      op.essayNote ? `Essay brief: ${op.essayNote}` : "",
      op.successTips ? `Insider tip: ${op.successTips}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const system =
      kind === "sop"
        ? "You are a senior admissions coach. Write a compelling, authentic motivation letter (380-450 words) for this student. Plain text only — no markdown, no headers, no placeholders like [x] except where truly unknown (use [your detail]). Structure: hook from real experience → why THIS programme specifically → what the student brings → clear post-study plan. Be concrete, warm, confident. Never invent degrees, awards or employers."
        : "You are an admissions application coach. Produce concise paste-ready answers (each 40-70 words, plain text) labelled exactly as: WHY_PROGRAMME / STRENGTHS / CAREER_PLAN / FINANCIAL_NOTE. No markdown. Be concrete and authentic; use [your detail] only where information is genuinely missing. Never invent facts.";

    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: system },
        { role: "user", content: `Student profile:\n${profileLine || "(profile not filled yet — keep placeholders gentle)"}\n\nProgramme:\n${opLine}` },
      ],
      thinking: { type: "disabled" },
    });

    const draft = completion.choices[0]?.message?.content?.trim() || "";
    if (!draft) {
      return NextResponse.json({ error: "Drafting failed — please try again." }, { status: 502 });
    }

    cache.set(key, { draft, ts: Date.now() });
    return NextResponse.json({ draft, cached: false });
  } catch (error) {
    console.error("essay drafting error:", error);
    return NextResponse.json(
      { error: "AI drafting is temporarily unavailable — you can still write your answers manually." },
      { status: 200 }
    );
  }
}
