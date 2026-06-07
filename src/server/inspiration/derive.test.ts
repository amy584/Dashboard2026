import { describe, it, expect } from "vitest";
import { deriveFactsFromInspiration } from "./derive";

describe("deriveFactsFromInspiration", () => {
  it("maps a saved restaurant + cuisine into food facts", () => {
    const facts = deriveFactsFromInspiration({
      category: "restaurant",
      place_name: "Toscanini",
      place_city: "Amsterdam",
      extracted: { cuisine: "italian" },
    });
    expect(facts).toContainEqual({ category: "food", key: "plek:Toscanini", value: "Toscanini, Amsterdam" });
    expect(facts).toContainEqual({ category: "food", key: "keuken", value: "Italian" });
  });

  it("maps flowers", () => {
    const facts = deriveFactsFromInspiration({
      category: "flowers",
      place_name: null,
      place_city: null,
      extracted: { flower_type: "peonies" },
    });
    expect(facts).toContainEqual({ category: "flowers", key: "bloemsoort", value: "Peonies" });
  });

  it("maps gift items to the wishlist and de-dupes", () => {
    const facts = deriveFactsFromInspiration({
      category: "gift",
      place_name: "Studio Klei",
      place_city: "Utrecht",
      extracted: { items: ["keramiek workshop", "keramiek workshop"] },
    });
    expect(facts.filter((f) => f.category === "wishlist").length).toBe(2); // place idea + one item (deduped)
    expect(facts).toContainEqual({ category: "wishlist", key: "cadeau-idee:Studio Klei", value: "Studio Klei, Utrecht" });
  });

  it("returns nothing when there's nothing to learn", () => {
    expect(
      deriveFactsFromInspiration({ category: "other", place_name: null, place_city: null, extracted: {} }),
    ).toEqual([]);
  });
});
