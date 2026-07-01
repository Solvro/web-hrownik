import crypto from "node:crypto";

const KEY_PREFIX = "hrk_";
const SECRET_BYTES = 24;
const PREFIX_DISPLAY_LENGTH = KEY_PREFIX.length + 6;

/** Generates a new API key secret. Only ever returned once, at creation. */
export function generateApiKeySecret(): string {
  return `${KEY_PREFIX}${crypto.randomBytes(SECRET_BYTES).toString("base64url")}`;
}

export function hashApiKeySecret(secret: string): string {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

/** First few characters of the secret, kept for display in the key list. */
export function getApiKeyDisplayPrefix(secret: string): string {
  return secret.slice(0, PREFIX_DISPLAY_LENGTH);
}
