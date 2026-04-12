import { encodeBase64url } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

export const TOKEN_LENGTH_BYTES = 32;

export function generateToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH_BYTES);
  crypto.getRandomValues(bytes);
  return encodeBase64url(bytes);
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = sha256(data);
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}
