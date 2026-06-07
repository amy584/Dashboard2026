/**
 * AIClient interface (§14). All AI runs server-side; the key is never exposed
 * to the client. Implementations: AnthropicAIClient (default) and a mock for
 * tests/local dev without a key.
 */

export interface ReelExtraction {
  category: "restaurant" | "flowers" | "travel" | "gift" | "other";
  place_name: string | null;
  place_city: string | null;
  items: string[];
  cuisine?: string | null;
  flower_type?: string | null;
  vibe?: string | null;
  price_band?: "low" | "mid" | "high" | null;
}

export interface SuggestionInput {
  dateType: string;
  partnerName: string;
  facts: { category: string; key: string; value: string }[];
  dislikes: string[];
  inspiration: { place_name: string | null; place_city: string | null; category: string }[];
  pastActionKinds: string[];
  pricePreference?: "low" | "mid" | "high";
}

export interface GeneratedSuggestion {
  kind: "flowers" | "reservation" | "gift" | "message" | "experience";
  title: string;
  body: string;
  why: string; // grounded, honest reason (§9)
  payload: Record<string, unknown>;
  estimatedCostCents?: number;
}

export interface MessageDraftInput {
  partnerName: string;
  endearment?: string | null;
  occasion: string;
  gestureSummary: string;
  tone?: "warm" | "playful" | "low_key";
}

export interface AIClient {
  /** Parse public reel/link text into structured taste data (§8). */
  extractReel(text: string): Promise<ReelExtraction>;
  /** Compose 1–3 grounded suggestions in brand voice (§9). */
  generateSuggestions(input: SuggestionInput): Promise<GeneratedSuggestion[]>;
  /** Draft a short partner message in the user's voice (§7). */
  draftPartnerMessage(input: MessageDraftInput): Promise<string>;
}
