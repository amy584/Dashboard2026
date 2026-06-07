import type { FulfilmentDraft, FulfilmentProvider, FulfilmentRequest } from "./types";
import { flowerProvider, giftProvider, restaurantProvider } from "./providers";

/**
 * Concierge-prep fulfilment (Fase 3). Assembles everything the user needs —
 * recipient + delivery address, delivery moment, message — and deep-links to
 * the right site (Topbloemen for flowers, the restaurant's reservation page),
 * with a ready-to-enter checklist. No autonomous booking/payment: the user
 * finishes and pays on the external site. A real API-backed provider can later
 * implement the same interface to place orders directly.
 */
export class DraftFulfilmentProvider implements FulfilmentProvider {
  async draft(request: FulfilmentRequest): Promise<FulfilmentDraft> {
    const p = request.payload as Record<string, string | number | undefined>;
    const recipientName = str(p.recipientName);
    const recipientAddress = str(p.recipientAddress);
    const deliveryDate = str(p.deliveryDate);
    const senderName = str(p.senderName);
    const senderPhone = str(p.senderPhone);
    const message = str(p.cardMessage);

    switch (request.kind) {
      case "flowers": {
        const type = String(p.flower_type ?? "bloemen");
        const provider = flowerProvider(type);
        const checklist = compact([
          `Bloemen: ${type}`,
          recipientAddress ? `Bezorgadres: ${recipientAddress}` : "Bezorgadres: vul haar adres in (zie Profiel)",
          deliveryDate ? `Bezorgdatum: ${formatDate(deliveryDate)}` : null,
          message ? `Kaarttekst: "${message}"` : null,
        ]);
        return {
          kind: "flowers",
          summary: `${type} laten bezorgen${recipientName ? ` bij ${recipientName}` : ""}.`,
          estimatedCostCents: Number(p.estimatedCostCents ?? 3500),
          providerName: provider.name,
          externalActionUrl: provider.url,
          checklist,
          details: { ...request.payload },
        };
      }
      case "reservation": {
        const place = String(p.place_name ?? "het restaurant");
        const city = p.place_city ? String(p.place_city) : "";
        const party = p.party_size ?? 2;
        const time = str(p.time);
        const provider = restaurantProvider(place, city);
        const checklist = compact([
          `Restaurant: ${place}${city ? `, ${city}` : ""}`,
          `Aantal personen: ${party}`,
          time ? `Datum/tijd: ${formatDate(time)}` : null,
          senderName ? `Op naam van: ${senderName}` : null,
          senderPhone ? `Telefoon: ${senderPhone}` : null,
        ]);
        return {
          kind: "reservation",
          summary: `Reservering voor ${party} bij ${place}${city ? `, ${city}` : ""}${
            time ? ` op ${formatDate(time)}` : ""
          }.`,
          estimatedCostCents: 0,
          providerName: provider.name,
          externalActionUrl: provider.url,
          checklist,
          details: { ...request.payload },
        };
      }
      case "gift":
      default: {
        const item = String(p.item ?? "een cadeau");
        const provider = giftProvider(item);
        return {
          kind: "gift",
          summary: `${item} regelen.`,
          estimatedCostCents: Number(p.estimatedCostCents ?? 0),
          providerName: provider.name,
          externalActionUrl: provider.url,
          checklist: compact([
            `Cadeau: ${item}`,
            recipientAddress ? `Bezorgadres: ${recipientAddress}` : null,
          ]),
          details: { ...request.payload },
        };
      }
    }
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function compact(arr: (string | null)[]): string[] {
  return arr.filter((x): x is string => !!x);
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("nl-NL", { dateStyle: "full", timeStyle: "short" });
}

export function getFulfilmentProvider(): FulfilmentProvider {
  return new DraftFulfilmentProvider();
}
