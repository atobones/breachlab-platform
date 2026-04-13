import { createHash } from "node:crypto";

const PALETTE = [" ", "#", "*", "+", ".", "/", "\\", "|", "-"];
const ROWS = 6;
const COLS = 7;

export function asciiAvatar(username: string): string[] {
  const hash = createHash("sha256").update(username).digest();
  const lines: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) {
      const byte = hash[(r * COLS + c) % hash.length];
      line += PALETTE[byte % PALETTE.length];
    }
    lines.push(line);
  }
  return lines;
}
