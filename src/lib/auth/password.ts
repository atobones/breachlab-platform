import { Argon2id } from "oslo/password";

const argon = new Argon2id();

export async function hashPassword(password: string): Promise<string> {
  return argon.hash(password);
}

export async function verifyPassword(
  hash: string,
  password: string
): Promise<boolean> {
  return argon.verify(hash, password);
}
