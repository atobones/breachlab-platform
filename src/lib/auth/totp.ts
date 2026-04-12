import { encodeBase32, decodeBase32 } from "@oslojs/encoding";
import { TOTPController, createTOTPKeyURI } from "oslo/otp";
import { TimeSpan } from "oslo";

const ISSUER = "BreachLab";
const PERIOD = new TimeSpan(30, "s");
const DIGITS = 6;

const controller = new TOTPController({
  digits: DIGITS,
  period: PERIOD,
});

export function generateTotpSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32(bytes);
}

export function totpUri(username: string, secret: string): string {
  const bytes = decodeBase32(secret);
  return createTOTPKeyURI(ISSUER, username, bytes, {
    digits: DIGITS,
    period: PERIOD,
  });
}

export async function generateTotpAtTime(
  secret: string,
  _now?: number
): Promise<string> {
  const bytes = decodeBase32(secret);
  return controller.generate(bytes);
}

export async function verifyTotp(
  secret: string,
  code: string,
  _now?: number
): Promise<boolean> {
  const bytes = decodeBase32(secret);
  return controller.verify(code, bytes);
}
