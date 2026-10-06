"use client";

/**
 * Email Autopilot — generates ready-to-send emails in the student's own voice.
 * Two delivery families (user picks, choice is remembered):
 *   1. "Open in my mail app"  → mailto: link (phone/desktop default client)
 *   2. "Webmail"              → Gmail / Outlook web compose deep links
 *   (+ copy-to-clipboard as a universal fallback)
 */

import type { CopilotProfile, MinimalOp } from "@/lib/copilot-store";

export type EmailKind =
  | "referee"
  | "feeWaiver"
  | "moiWaiver"
  | "missingDoc"
  | "statusFollowup"
  | "transcriptRequest"
  | "deferral";

export const EMAIL_KINDS: { kind: EmailKind; label: string; desc: string; icon: string; toReferee?: boolean }[] = [
  { kind: "referee", label: "Request a recommendation letter", desc: "Ask a lecturer/boss with deadline + program info", icon: "📨", toReferee: true },
  { kind: "feeWaiver", label: "Ask admissions for a fee waiver", desc: "For low-fee applications — many universities grant these", icon: "💳" },
  { kind: "moiWaiver", label: "Claim English-test waiver (MOI)", desc: "Cite your English-medium education instead of IELTS/TOEFL", icon: "🗣️" },
  { kind: "missingDoc", label: "Ask about a missing document / exception", desc: "Unofficial transcript OK? Certified copy later?", icon: "❓" },
  { kind: "statusFollowup", label: "Follow up on a submitted application", desc: "Polite status check after 3-4 weeks", icon: "🔍" },
  { kind: "transcriptRequest", label: "Request transcript from your school", desc: "Official copy to your registry/registrar", icon: "📑" },
  { kind: "deferral", label: "Ask to defer admission", desc: "If life happens after you get admitted", icon: "⏳" },
];

export interface EmailDraft {
  subject: string;
  body: string;
  to: string;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "the stated deadline";
  try {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  } catch {
    return "the stated deadline";
  }
}

function sig(p: CopilotProfile): string {
  return [
    `Sincerely,`,
    p.fullName || "[Your name]",
    p.phone ? `Phone/WhatsApp: ${p.phone}` : "",
    p.email ? `Email: ${p.email}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildEmail(kind: EmailKind, profile: CopilotProfile, op: MinimalOp, extra: { refereeName?: string; note?: string } = {}): EmailDraft {
  const me = profile.fullName || "[Your name]";
  const program = op.name;
  const deadline = fmtDate(op.cycle?.nextClose);

  switch (kind) {
    case "referee": {
      const ref = profile.referees.find((r) => r.name === extra.refereeName) ?? profile.referees[0];
      return {
        to: ref?.email ?? "",
        subject: `Recommendation letter request — ${program} (deadline ${deadline})`,
        body: `Dear ${ref?.name || "Professor [Name]"},

I hope this message finds you well. I am applying to ${program} (${op.provider}, ${op.country}), and I would be honoured if you would serve as one of my referees. The application closes on ${deadline}, and the portal will email you a secure link — submitting it takes roughly 10-15 minutes.

A few quick facts to make your letter easier:

• Programme: ${program} — ${op.kind === "SCHOLARSHIP" ? "fully funded scholarship" : "degree programme"}
• Our relationship: ${ref?.relation || "your [course/role] during [year]"}
• Key points you might mention: [your grade in their course], [project you did], my goal — ${profile.careerGoal ? profile.careerGoal.slice(0, 160) : "[one line on your career goal]"}
• Submission: online portal link, deadline ${deadline}

I have attached my CV, transcript and a draft of the key points I am highlighting in my application, so you have everything in one place. Of course, you are welcome to write whatever you feel is most accurate.

Would you be comfortable supporting my application? If your schedule makes it difficult, I completely understand — please just let me know by [date + 1 week] so I can arrange an alternative.

Thank you very much for your time and support.

${sig(profile)}`,
      };
    }

    case "feeWaiver":
      return {
        to: "",
        subject: `Application fee waiver request — ${program} — ${me}`,
        body: `Dear Admissions Team,

I am writing to request a waiver of the application fee (${op.feeConfirmedFree ? "currently $0 — thank you" : `${op.feeCurrency} ${op.feeAmount}`}) for ${program}.

I am a ${profile.nationality || "[nationality]"} applicant holding ${profile.highestDegree || "[my degree]"} from ${profile.degreeInstitution || "[my university]"}. I intend to apply well before the ${deadline} deadline, and the application fee represents a significant barrier for me at current exchange rates. ${extra.note ? `\n${extra.note}\n` : ""}
Several programmes at comparable institutions waive this fee for applicants from lower-income countries or those demonstrating financial need, and I would be grateful if you could consider my request under such a policy.

I am fully committed to submitting a complete, competitive application — my documents (transcripts, certificates, references) are ready. If a fee waiver is not possible, could you kindly confirm the lowest available fee route or any regional waivers I might qualify for?

Thank you very much for your time and consideration.

${sig(profile)}`,
      };

    case "moiWaiver":
      return {
        to: "",
        subject: `English proficiency — Medium-of-Instruction waiver request — ${program} — ${me}`,
        body: `Dear Admissions Team,

I am applying to ${program} and would like to request an English-proficiency waiver based on Medium of Instruction (MOI), in place of IELTS/TOEFL.

All of my prior education was conducted entirely in English:
• Institution: ${profile.degreeInstitution || "[school/university]"}, ${profile.degreeCountry || "[country]"}
• Language of instruction and examination: English${profile.englishTestDetails ? `\n• Supporting note: ${profile.englishTestDetails}` : ""}
• I can provide an official MOI certificate signed by my institution (attached).

My academic work — essays, theses and examinations — was written and assessed in English, and I have used English professionally ever since. I would be grateful if you could confirm whether the MOI certificate satisfies your English requirement for applicants from ${profile.nationality || "[my country]"}, or whether any additional evidence (e.g. a video interview or a WAEC/English grade) would help.

Thank you for considering my request.

${sig(profile)}`,
      };

    case "missingDoc":
      return {
        to: "",
        subject: `Document clarification before I apply — ${program} — ${me}`,
        body: `Dear Admissions Team,

I am preparing my application to ${program} (deadline ${deadline}) and would like to confirm one document requirement in advance so my submission is complete and correct.

My question: ${extra.note || "[e.g. Can I upload an unofficial scanned transcript at the application stage and send the certified copy only if admitted?]"}

For context: I completed ${profile.highestDegree || "[my degree]"} at ${profile.degreeInstitution || "[institution]"}, and ${op.unofficialTranscripts ? "your portal indicates scanned copies are acceptable at application stage — I simply want to be certain." : "your requirements mention officially certified documents — my registry issues them, though certification takes several weeks, so I want to plan ahead."}

Thank you very much — a one-line confirmation would be enormously helpful and will let me submit sooner.

${sig(profile)}`,
      };

    case "statusFollowup":
      return {
        to: "",
        subject: `Application status enquiry — ${program} — ${me}`,
        body: `Dear Admissions Team,

I submitted my application to ${program} on ${"[submission date]"} and wanted to kindly enquire about its status, as the evaluation timeline has passed / I understand decisions are being released around now.

Details for locating my file:
• Applicant name: ${me}
• ${profile.nationality ? `Nationality: ${profile.nationality}` : ""}
• Programme: ${program}
• Application/portal ID: [your ID]

I remain very enthusiastic about the programme. If anything is missing from my file, I would be grateful for the chance to supply it promptly.

Thank you for your time — I look forward to your update.

${sig(profile)}`,
      };

    case "transcriptRequest":
      return {
        to: "",
        subject: `Official transcript request — ${me} — ${profile.highestDegree || "[programme]"} graduate`,
        body: `Dear Registry / Student Records,

I am ${me}, a graduate of ${profile.degreeInstitution || "[institution]"} (${profile.highestDegree || "[degree]"}, ${profile.graduationYear || "[year]"}, student ID: [ID if known]). I am applying for ${program} in ${op.country}, and the admissions office requires an official transcript sent directly from the institution.

Could you please:
1. Issue an official transcript covering my full period of study, and
2. Send it ${"[sealed envelope to my address]"} / ${"[electronically to the admissions portal]"} — whichever your standard procedure allows — by ${deadline} if possible.

I have attached a completed request form / my identification, and I am happy to pay any issuance or courier fee — kindly confirm the amount and payment method. If electronic delivery is available, it would be much faster.

Thank you for your help.

${sig(profile)}`,
      };

    case "deferral":
      return {
        to: "",
        subject: `Deferral request — ${program} — ${me}`,
        body: `Dear Admissions Team,

I was delighted to receive my offer for ${program}. Due to ${extra.note || "[brief honest reason — visa delay, funding confirmation, medical/family circumstance]"}, I would like to respectfully request a deferral of my admission to the next intake, if your policy permits.

I remain fully committed to the programme: my documents are complete, and I meet all stated conditions. I would be glad to provide any supporting documentation for the deferral request.

Could you kindly confirm whether a deferral is possible, for how long, and what steps are required on my side?

Thank you very much for your understanding.

${sig(profile)}`,
      };
  }
}

// ── Send pipelines ───────────────────────────────────────────────────

export interface SendOptions {
  mode: "mailapp" | "gmail" | "outlook" | "copy";
}

function encode(d: EmailDraft): { su: string; body: string } {
  return { su: encodeURIComponent(d.subject), body: encodeURIComponent(d.body) };
}

export function mailtoUrl(d: EmailDraft): string {
  const { su, body } = encode(d);
  return `mailto:${encodeURIComponent(d.to)}?subject=${su}&body=${body}`;
}

export function gmailUrl(d: EmailDraft): string {
  const { su, body } = encode(d);
  return `https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=${encodeURIComponent(d.to)}&su=${su}&body=${body}`;
}

export function outlookUrl(d: EmailDraft): string {
  const { su, body } = encode(d);
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(d.to)}&subject=${su}&body=${body}`;
}

export async function copyEmail(d: EmailDraft): Promise<boolean> {
  const text = `To: ${d.to || "[admissions email]"}\nSubject: ${d.subject}\n\n${d.body}`;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / permissions
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
