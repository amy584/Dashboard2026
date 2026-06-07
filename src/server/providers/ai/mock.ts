import type {
  AIClient,
  GeneratedSuggestion,
  MessageDraftInput,
  ReelExtraction,
  SuggestionInput,
} from "./types";

/**
 * Deterministic mock AIClient for local dev (no API key) and tests.
 * Grounds its output in the inputs so behaviour stays realistic.
 */
export class MockAIClient implements AIClient {
  async extractReel(text: string): Promise<ReelExtraction> {
    const lower = text.toLowerCase();
    const isFood = /restaurant|eten|dinner|pasta|sushi|wijn|lunch/.test(lower);
    return {
      category: isFood ? "restaurant" : "other",
      place_name: null,
      place_city: null,
      items: [],
      cuisine: isFood ? "italian" : null,
      flower_type: /bloem|flower|peon|roos/.test(lower) ? "peonies" : null,
      vibe: null,
      price_band: "mid",
    };
  }

  async generateSuggestions(input: SuggestionInput): Promise<GeneratedSuggestion[]> {
    const out: GeneratedSuggestion[] = [];
    const months = input.monthsSinceByKind ?? {};
    const recencyNote = (kind: string) => {
      const m = months[kind];
      if (m === null || m === undefined) return "";
      return m >= 1 ? ` Het is ~${m} ${m === 1 ? "maand" : "maanden"} geleden.` : "";
    };
    const flowers = input.facts.find((f) => f.category === "flowers");
    if (flowers) {
      out.push({
        kind: "flowers",
        title: `${flowers.value} voor ${input.partnerName}`,
        body: "Een klein gebaar dat altijd raak is.",
        why: `${flowers.value} staat op haar cheat sheet.${recencyNote("flowers")}`,
        payload: { flower_type: flowers.value },
        estimatedCostCents: 3500,
      });
    }
    const place = input.inspiration[0];
    if (place?.place_name) {
      out.push({
        kind: "reservation",
        title: `Tafel bij ${place.place_name}`,
        body: "Ze had dit zelf opgeslagen.",
        why: `Ze bewaarde een reel van ${place.place_name}.`,
        payload: { place_name: place.place_name, place_city: place.place_city, party_size: 2 },
        estimatedCostCents: 0,
      });
    }
    if (out.length === 0) {
      out.push({
        kind: "message",
        title: `Een berichtje voor ${input.partnerName}`,
        body: "Soms is een attent bericht genoeg.",
        why: "Geen specifieke voorkeuren bekend — begin klein.",
        payload: {},
        estimatedCostCents: 0,
      });
    }
    return out.slice(0, 3);
  }

  async draftPartnerMessage(input: MessageDraftInput): Promise<string> {
    const name = input.endearment || input.partnerName;
    return `Hé ${name}, ik heb iets geregeld voor ${input.occasion.toLowerCase()}. ${input.gestureSummary} Tot zo. x`;
  }
}
