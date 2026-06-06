import type { AIClient } from "./types";
import { AnthropicAIClient } from "./anthropic";
import { MockAIClient } from "./mock";

export * from "./types";

/**
 * Factory for the active AIClient. Falls back to the deterministic mock when
 * no API key is configured, so local dev and tests work out of the box.
 */
export function getAIClient(): AIClient {
  if (process.env.ANTHROPIC_API_KEY) return new AnthropicAIClient();
  return new MockAIClient();
}
