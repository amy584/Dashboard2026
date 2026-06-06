import type { FulfilmentDraft, FulfilmentProvider, FulfilmentRequest } from "./types";

/**
 * Default draft-only fulfilment provider (MVP, §7/§16). It assembles a clear
 * summary + a self-serve link (mailto/search) so the user can complete the
 * booking himself. No autonomous side effects. A real provider implements the
 * same interface to actually place orders later.
 */
export class DraftFulfilmentProvider implements FulfilmentProvider {
  async draft(request: FulfilmentRequest): Promise<FulfilmentDraft> {
    const p = request.payload as Record<string, string | number | undefined>;
    switch (request.kind) {
      case "reservation": {
        const place = String(p.place_name ?? "het restaurant");
        const city = p.place_city ? `, ${p.place_city}` : "";
        const party = p.party_size ?? 2;
        const time = p.time ? ` om ${p.time}` : "";
        return {
          kind: "reservation",
          summary: `Reservering voor ${party} bij ${place}${city}${time}.`,
          estimatedCostCents: 0,
          externalActionUrl: `https://www.google.com/search?q=${encodeURIComponent(
            `${place}${city} reserveren`,
          )}`,
          details: { ...request.payload },
        };
      }
      case "flowers": {
        const type = String(p.flower_type ?? "bloemen");
        return {
          kind: "flowers",
          summary: `${type} laten bezorgen.`,
          estimatedCostCents: Number(p.estimatedCostCents ?? 3500),
          externalActionUrl: `https://www.google.com/search?q=${encodeURIComponent(
            `${type} bezorgen`,
          )}`,
          details: { ...request.payload },
        };
      }
      case "gift":
      default: {
        const item = String(p.item ?? "een cadeau");
        return {
          kind: "gift",
          summary: `${item} regelen.`,
          estimatedCostCents: Number(p.estimatedCostCents ?? 0),
          details: { ...request.payload },
        };
      }
    }
  }
}

export function getFulfilmentProvider(): FulfilmentProvider {
  return new DraftFulfilmentProvider();
}
