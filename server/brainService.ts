/**
 * Festival Brain — Shadow Mode Service
 *
 * Lesson extraction from operator messages, debriefs, and observations.
 * Uses Claude Sonnet to convert raw input into structured operational rules.
 */

import { invokeLLM } from "./_core/llm";
import type { InsertBrainLesson, InsertBrainAgentLog, InsertBrainChatMessage } from "../drizzle/schema";

// ── Types ────────────────────────────────────────────────────────────────

export type LessonCategory = "order" | "staff" | "logistics" | "timing" | "finance" | "ops" | "safety" | "quality";
export type LessonSource = "you_said" | "file_change" | "sales_data" | "debrief" | "post_festival";

interface ExtractedLesson {
  category: LessonCategory;
  rule: string;
  rule_condition: string;
  numbers: { forecast: number | null; actual: number | null; deviation_pct: number | null };
  action_next_time: string;
  confidence: number;
}

interface ExtractionContext {
  festivalSlug: string;
  festivalName: string;
  concept?: string;
  dayNumber?: number;
  totalDays?: number;
  salesSummary?: string;
}

// ── Lesson Extractor ─────────────────────────────────────────────────────

const LESSON_EXTRACTOR_PROMPT = `You are the memory system for The Fish Project — a Danish food vendor operating at music festivals across Denmark.

The operator has sent this message during a festival:
"{USER_MESSAGE}"

Context:
- Festival: {FESTIVAL_NAME} ({FESTIVAL_SLUG})
- Concept: {CONCEPT}
- Day: {DAY_INFO}
- Sales so far: {SALES_SUMMARY}

Extract 1-3 operational rules from this message. For each rule return a JSON object:
{
  "category": "order|staff|logistics|timing|finance|ops|safety|quality",
  "rule": "one clear sentence — what to do",
  "rule_condition": "when does this rule apply (be specific about festival size, concept, timing)",
  "numbers": { "forecast": null, "actual": null, "deviation_pct": null },
  "action_next_time": "specific action for next festival",
  "confidence": 60
}

Category guide:
- order: food quantities, ingredient sourcing, supplier coordination
- staff: headcount, shifts, roles, volunteer management
- logistics: transport, cooling, accommodation, equipment
- timing: setup schedules, arrival times, deadlines, opening hours
- finance: revenue, costs, commission, pricing, breakeven
- ops: daily operations, POS, stock management, service flow
- safety: gas checks, fire certs, inspections, health & safety
- quality: food quality, presentation, customer feedback

Rules:
- Be specific with numbers when available. "Order 11.25kg fish per 10,000 attendance per day" is better than "Order enough fish"
- Confidence starts at 60 for first observation. Only go higher if the message confirms a pattern.
- If the message contains NO learnable rule (e.g. "ok", "thanks", "good"), return an empty array.

Return ONLY a JSON array. No markdown, no explanation.`;

export async function extractLessons(
  userMessage: string,
  context: ExtractionContext,
): Promise<ExtractedLesson[]> {
  const prompt = LESSON_EXTRACTOR_PROMPT
    .replace("{USER_MESSAGE}", userMessage)
    .replace("{FESTIVAL_NAME}", context.festivalName)
    .replace("{FESTIVAL_SLUG}", context.festivalSlug)
    .replace("{CONCEPT}", context.concept || "all concepts")
    .replace("{DAY_INFO}", context.dayNumber
      ? `Day ${context.dayNumber} of ${context.totalDays || "?"}`
      : "Pre-festival / not specified")
    .replace("{SALES_SUMMARY}", context.salesSummary || "No sales data yet");

  const startTime = Date.now();

  const response = await invokeLLM({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: userMessage },
    ],
    maxTokens: 2048,
  });

  const content = response.choices[0]?.message?.content ?? "[]";

  // Parse JSON from response — handle markdown code fences
  let cleaned = content.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((l: any) =>
      l.category && l.rule && l.action_next_time
    ).map((l: any) => ({
      category: l.category as LessonCategory,
      rule: l.rule,
      rule_condition: l.rule_condition || "",
      numbers: {
        forecast: l.numbers?.forecast ?? null,
        actual: l.numbers?.actual ?? null,
        deviation_pct: l.numbers?.deviation_pct ?? null,
      },
      action_next_time: l.action_next_time,
      confidence: Math.min(100, Math.max(0, l.confidence ?? 60)),
    }));
  } catch {
    console.error("[brain] Failed to parse lesson extraction:", cleaned);
    return [];
  }
}

// ── Brain Response Generator ─────────────────────────────────────────────

const BRAIN_RESPONSE_PROMPT = `You are the Festival Brain for The Fish Project — a Danish food vendor at music festivals.

You just received a message from the operator and extracted {LESSON_COUNT} operational lessons from it.

Extracted lessons:
{LESSONS_JSON}

Write a short, casual response (2-4 sentences max) that:
1. Acknowledges what they said
2. Confirms what you learned from it (the rule you extracted)
3. Mentions how you'll apply it next time, if relevant

Keep the tone like a smart colleague — not formal, not robotic. Use emojis sparingly (max 1).
If no lessons were extracted, just acknowledge the message naturally.

Respond in English. Be concise.`;

export async function generateBrainResponse(
  userMessage: string,
  lessons: ExtractedLesson[],
): Promise<string> {
  const prompt = BRAIN_RESPONSE_PROMPT
    .replace("{LESSON_COUNT}", String(lessons.length))
    .replace("{LESSONS_JSON}", JSON.stringify(lessons, null, 2));

  const response = await invokeLLM({
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: userMessage },
    ],
    maxTokens: 512,
  });

  return response.choices[0]?.message?.content ?? "Got it. Noted.";
}

// ── Evening Debrief Generator ────────────────────────────────────────────

export function generateDebriefQuestions(
  festivalName: string,
  dayNumber: number,
  salesData?: { covers: number; revenue: number; vsForecastPct: number },
): string {
  const salesLine = salesData
    ? `📊 ${salesData.covers} covers · ${salesData.revenue.toLocaleString()} kr revenue\n${salesData.vsForecastPct > 0 ? "📈" : "📉"} ${Math.abs(salesData.vsForecastPct)}% vs forecast`
    : "📊 No sales data synced yet";

  return `🧠 Festival Brain — Day ${dayNumber} debrief (2 min)

Today at ${festivalName}:
${salesLine}

5 quick questions:

1/ What went BETTER than expected today?
2/ What went WORSE or surprised you?
3/ Did you run out of ANYTHING (even briefly)?
4/ Any STAFF issues (too many, too few, wrong roles)?
5/ One thing you'd do DIFFERENTLY tomorrow?

Reply to each — even one word is enough.`;
}

// ── Confidence Score Updater ─────────────────────────────────────────────

export function calculateNewConfidence(
  current: number,
  wasCorrect: boolean,
  timesApplied: number,
): number {
  // Bayesian-ish confidence update
  // Correct application → confidence grows (diminishing returns)
  // Incorrect → confidence drops faster (mistakes are signal)
  if (wasCorrect) {
    const boost = Math.max(2, 15 - timesApplied * 2); // less boost as it matures
    return Math.min(100, current + boost);
  } else {
    const drop = Math.max(5, 20 - timesApplied); // larger drops early on
    return Math.max(10, current - drop);
  }
}

// ── Convert extracted lessons to DB insert format ────────────────────────

export function lessonsToInserts(
  lessons: ExtractedLesson[],
  context: ExtractionContext,
  source: LessonSource,
  rawInput: string,
): InsertBrainLesson[] {
  return lessons.map(l => ({
    festivalSlug: context.festivalSlug,
    concept: context.concept || null,
    dayNumber: context.dayNumber || null,
    source,
    rawInput,
    category: l.category,
    rule: l.rule,
    ruleCondition: l.rule_condition,
    confidence: l.confidence,
    forecastValue: l.numbers.forecast?.toString() ?? null,
    actualValue: l.numbers.actual?.toString() ?? null,
    deviationPct: l.numbers.deviation_pct?.toString() ?? null,
    actionNextTime: l.action_next_time,
  }));
}
