import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * AES-256-GCM encryption for sensitive tokens at rest (§12), e.g. calendar
 * OAuth tokens. The key comes from TOKEN_ENCRYPTION_KEY (base64, 32 bytes).
 * Output format: base64(iv).base64(authTag).base64(ciphertext).
 */
function key(): Buffer {
  const k = Buffer.from(serverEnv.tokenEncryptionKey, "base64");
  if (k.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must decode to 32 bytes (use `openssl rand -base64 32`)");
  }
  return k;
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(".");
}

export function decryptToken(payload: string): string {
  const [ivB64, tagB64, dataB64] = payload.split(".");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Malformed encrypted token");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
