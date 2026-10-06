import { NextRequest, NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/browse-assist — the Co-Pilot Browser's brain.
 *
 * mode "guide": given page text + detected form fields, explain what the page
 *               is asking for and the next actions (short, ordered).
 * mode "map":   given detected form fields + the user's profile, return a
 *               JSON map { fieldId: value } the client autofills into the page.
 *
 * Fails soft: returns { error } — the browser UI degrades to manual fill.
 */

const cache = new Map<string, { at: number; payload: unknown }>();
const TTL = 10 * 60 * 1000;

interface FieldIn {
  id: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
}

function cacheGet(key: string): unknown | null {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.payload;
  if (hit) cache.delete(key);
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: "guide" | "map" = body.mode === "map" ? "map" : "guide";
    const pageText: string = String(body.pageText ?? "").slice(0, 6000);
    const fields: FieldIn[] = Array.isArray(body.fields) ? body.fields.slice(0, 60) : [];
    const appName: string = String(body.appName ?? "this application");
    const profile = body.profile ?? {};

    const key = JSON.stringify([mode, pageText.slice(0, 500), fields.map((f) => f.id), profile.fullName]);
    const cached = cacheGet(key);
    if (cached) return NextResponse.json(cached as Record<string, unknown>);

    const zai = await ZAI.create();

    if (mode === "guide") {
      const fieldLines = fields
        .slice(0, 25)
        .map((f) => `- ${f.label} (${f.type}${f.required ? ", required" : ""})`)
        .join("\n");
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are the ScholarGlobe Apply Co-Pilot helping a student fill an application page inside an in-app browser. " +
              "Given the page text and detected form fields, reply with: (1) one sentence on what this page is, " +
              "(2) 'Do now:' 3-5 short ordered actions for the user, (3) 'Needs you:' any CAPTCHA, payment, password or file-upload steps the user MUST do personally. " +
              "Be concrete and under 150 words. Plain text, no markdown headings.",
          },
          {
            role: "user",
            content: `Application: ${appName}\n\nPage text (trimmed):\n${pageText}\n\nDetected fields:\n${fieldLines || "none"}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 400,
      });
      const payload = { guidance: completion.choices[0]?.message?.content?.trim() || null };
      cache.set(key, { at: Date.now(), payload });
      return NextResponse.json(payload);
    }

    // mode "map"
    const profLines = Object.entries(profile)
      .filter(([, v]) => typeof v === "string" && v.trim())
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    const fieldLines = fields
      .map((f) => {
        const opts = f.options && f.options.length ? ` options=[${f.options.slice(0, 8).join(" | ")}]` : "";
        return `- id="${f.id}" label="${f.label}" type=${f.type}${f.required ? " required" : ""}${opts}`;
      })
      .join("\n");

    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "system",
          content:
            "Map application form fields to the student's saved profile. Return ONLY a JSON object " +
            '{"fills": {"<id>": "<value>"}} with values taken VERBATIM from the profile below. ' +
            "Rules: never invent facts; if no profile value fits a field, omit that id; " +
            "never fill passwords, CAPTCHA or card/payment fields; " +
            'date of birth in YYYY-MM-DD; pick radio/select values ONLY from the given options; ' +
            "for 'first name' use the first word of fullName, 'last name' the remaining words.",
        },
        {
          role: "user",
          content: `Profile:\n${profLines || "(empty — return {})"}\n\nFields:\n${fieldLines || "none"}`,
        },
      ],
      temperature: 0,
      max_tokens: 900,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let fills: Record<string, string> = {};
    try {
      const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
      const parsed = JSON.parse(jsonText) as { fills?: Record<string, string> };
      fills = parsed.fills ?? {};
    } catch {
      fills = {};
    }
    const payload = { fills };
    cache.set(key, { at: Date.now(), payload });
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: "AI assist unavailable right now" }, { status: 200 });
  }
}
