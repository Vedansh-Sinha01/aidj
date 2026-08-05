import mammoth from "mammoth";

export type ExtractedText = { text: string } | { failed: true; reason: string };

/** §7 — pulls raw text out of a PDF or .docx résumé. Scanned/image PDFs are flagged, not crashed on. */
export async function extractResumeText(buffer: Buffer, fileName: string): Promise<ExtractedText> {
  const ext = fileName.toLowerCase().split(".").pop();

  try {
    if (ext === "pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      const text = result.text?.trim() ?? "";
      if (text.length < 30) {
        return {
          failed: true,
          reason:
            "Couldn't extract text from this PDF (it may be a scanned image). Please enter the candidate's details manually.",
        };
      }
      return { text };
    }

    if (ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      const text = result.value?.trim() ?? "";
      if (text.length < 30) {
        return { failed: true, reason: "Couldn't extract text from this document. Please enter details manually." };
      }
      return { text };
    }

    return { failed: true, reason: "Unsupported file type — please upload a PDF or .docx résumé." };
  } catch (err) {
    console.error("Résumé text extraction failed:", err);
    return { failed: true, reason: "Couldn't read this file. Please enter the candidate's details manually." };
  }
}

export type ParsedResumeFields = {
  name: string | null;
  email: string | null;
  phone: string | null;
  mostRecentCompany: string | null;
  mostRecentTitle: string | null;
  mostRecentStart: string | null; // ISO date, best-effort
  mostRecentEnd: string | null; // ISO date, null if current
  yearsOfExperience: number | null;
  certifications: string[];
};

const EMPTY_FIELDS: ParsedResumeFields = {
  name: null,
  email: null,
  phone: null,
  mostRecentCompany: null,
  mostRecentTitle: null,
  mostRecentStart: null,
  mostRecentEnd: null,
  yearsOfExperience: null,
  certifications: [],
};

/**
 * §7 — AI-assisted structured extraction: identifies the single most recent
 * job (not full history) and computes total years of experience across
 * potentially messy/gapped dates, which needs actual comprehension rather
 * than regex. Requires ANTHROPIC_API_KEY; falls back to blank fields (for
 * fully manual entry in the review step) when it isn't configured.
 */
export async function aiExtractResumeFields(text: string): Promise<ParsedResumeFields> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return EMPTY_FIELDS;

  const prompt = `You are extracting structured fields from a candidate's résumé for an ATS. Read the résumé text below and return ONLY a JSON object (no markdown fences, no commentary) with exactly these keys:

{
  "name": string or null,
  "email": string or null,
  "phone": string or null,
  "mostRecentCompany": string or null,   // employer of the SINGLE most recent job only
  "mostRecentTitle": string or null,     // title of the SINGLE most recent job only
  "mostRecentStart": string or null,     // ISO date "YYYY-MM-DD" (use "-01" for day if only month/year known)
  "mostRecentEnd": string or null,       // ISO date, or null if this is their current job
  "yearsOfExperience": number or null,   // total professional experience, computed across ALL jobs listed (handle gaps/overlaps sensibly), rounded to 1 decimal
  "certifications": string[]             // certifications/credentials mentioned, as written
}

Résumé text:
"""
${text.slice(0, 15000)}
"""`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      console.error("Anthropic API error:", res.status, await res.text());
      return EMPTY_FIELDS;
    }

    const data = await res.json();
    const raw: string = data.content?.[0]?.text ?? "{}";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    return {
      name: parsed.name ?? null,
      email: parsed.email ?? null,
      phone: parsed.phone ?? null,
      mostRecentCompany: parsed.mostRecentCompany ?? null,
      mostRecentTitle: parsed.mostRecentTitle ?? null,
      mostRecentStart: parsed.mostRecentStart ?? null,
      mostRecentEnd: parsed.mostRecentEnd ?? null,
      yearsOfExperience: typeof parsed.yearsOfExperience === "number" ? parsed.yearsOfExperience : null,
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
    };
  } catch (err) {
    console.error("Résumé AI extraction failed:", err);
    return EMPTY_FIELDS;
  }
}
