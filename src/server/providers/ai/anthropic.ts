import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";
import type {
  AIClient,
  GeneratedSuggestion,
  MessageDraftInput,
  ReelExtraction,
  SuggestionInput,
} from "./types";

/**
 * Anthropic-backed AIClient. Server-side only. Prompts are constrained to
 * return JSON; we parse defensively and never let the model invent facts about
 * the partner — it only composes from the structured data we pass in (§9).
 */
export class AnthropicAIClient implements AIClient {
  private client: Anthropic;
  private model: string;

  constructor() {
    this.client = new Anthropic({ apiKey: serverEnv.anthropicApiKey });
    this.model = serverEnv.anthropicModel;
  }

  private async json<T>(system: string, user: string): Promise<T> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return safeParseJson<T>(text);
  }

  async extractReel(text: string): Promise<ReelExtraction> {
    const system =
      "You extract structured taste data from a social post caption. " +
      "Return ONLY JSON matching: {category, place_name, place_city, items, cuisine, flower_type, vibe, price_band}. " +
      "Use null where unknown. Do not invent specifics that aren't supported by the text.";
    return this.json<ReelExtraction>(system, text || "");
  }

  async generateSuggestions(input: SuggestionInput): Promise<GeneratedSuggestion[]> {
    const system =
      "You are Attent, suggesting thoughtful gestures a man can do for his partner. " +
      "Voice: direct, benefit-driven, lightly cheeky, Dutch. " +
      "STRICT RULES: only use the facts provided; never invent details about the partner; " +
      "never suggest anything on the dislikes list; avoid repeating recent action kinds. " +
      "Use monthsSinceByKind to gauge timing — if it has been a while (or never) for a kind, " +
      "that is a strong reason to suggest it now and the 'why' may reference how long it's been. " +
      'Return ONLY a JSON array of 1-3 items: {kind,title,body,why,payload,estimatedCostCents}. ' +
      'The "why" must reference a real fact, saved item, or the recency.';
    const result = await this.json<GeneratedSuggestion[]>(system, JSON.stringify(input));
    return Array.isArray(result) ? result.slice(0, 3) : [];
  }

  async draftPartnerMessage(input: MessageDraftInput): Promise<string> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 300,
      system:
        "Draft a short, natural message from a man to his partner, in Dutch, as if he planned " +
        "the gesture himself. Warm, not cheesy. Return only the message text, no quotes.",
      messages: [{ role: "user", content: JSON.stringify(input) }],
    });
    return res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  }
}

/** Parse model output as JSON, tolerating code fences and surrounding prose. */
function safeParseJson<T>(text: string): T {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("AI did not return valid JSON");
  }
}
