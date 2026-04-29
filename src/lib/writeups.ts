import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { marked } from "marked";

const WRITEUPS_DIR = join(process.cwd(), "content", "writeups");

export type WriteupMeta = {
  slug: string;
  track: string;
  level: number;
  title: string;
  difficulty: string;
  prereqLevels: number[];
  estimatedTime: string;
  prerequisites: string[];
};

export type Writeup = WriteupMeta & {
  html: string;
};

function parseFrontMatter(raw: string): { data: Record<string, unknown>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { data: {}, body: raw };
  const data: Record<string, unknown> = {};
  const lines = m[1].split("\n");
  let pendingKey: string | null = null;
  let pendingArr: string[] | null = null;
  for (const line of lines) {
    if (pendingArr && /^\s+-\s+/.test(line)) {
      pendingArr.push(line.replace(/^\s+-\s+/, "").trim().replace(/^["']|["']$/g, ""));
      continue;
    }
    if (pendingKey && pendingArr) {
      data[pendingKey] = pendingArr;
      pendingKey = null;
      pendingArr = null;
    }
    const kv = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim();
    if (val === "") {
      pendingKey = key;
      pendingArr = [];
      continue;
    }
    if (val.startsWith("[") && val.endsWith("]")) {
      data[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter((s) => s.length > 0)
        .map((s) => (/^-?\d+$/.test(s) ? Number(s) : s));
      continue;
    }
    data[key] = val.replace(/^["']|["']$/g, "");
  }
  if (pendingKey && pendingArr) data[pendingKey] = pendingArr;
  return { data, body: m[2] };
}

function metaFromFrontMatter(data: Record<string, unknown>): WriteupMeta {
  const prereqLevelsRaw = data.prereq_levels;
  const prereqLevels = Array.isArray(prereqLevelsRaw)
    ? (prereqLevelsRaw as unknown[])
        .map((v) => {
          if (typeof v === "number") return v;
          if (typeof v !== "string") return null;
          const m = v.match(/(\d+)/);
          return m ? Number(m[1]) : null;
        })
        .filter((v): v is number => v !== null)
    : [];
  const prerequisitesRaw = data.prerequisites;
  const prerequisites = Array.isArray(prerequisitesRaw)
    ? (prerequisitesRaw as unknown[]).filter((v): v is string => typeof v === "string")
    : [];
  return {
    slug: String(data.slug ?? ""),
    track: String(data.track ?? ""),
    level: Number(data.level ?? 0),
    title: String(data.title ?? ""),
    difficulty: String(data.difficulty ?? ""),
    prereqLevels,
    estimatedTime: String(data.estimated_time ?? ""),
    prerequisites,
  };
}

export async function listWriteups(): Promise<WriteupMeta[]> {
  const files = await readdir(WRITEUPS_DIR).catch(() => [] as string[]);
  const mds = files.filter((f) => f.endsWith(".md"));
  const out: WriteupMeta[] = [];
  for (const f of mds) {
    const raw = await readFile(join(WRITEUPS_DIR, f), "utf8");
    const { data } = parseFrontMatter(raw);
    out.push(metaFromFrontMatter(data));
  }
  out.sort((a, b) => (a.track === b.track ? a.level - b.level : a.track.localeCompare(b.track)));
  return out;
}

export async function loadWriteup(track: string, level: number): Promise<Writeup | null> {
  const all = await listWriteups();
  const meta = all.find((w) => w.track === track && w.level === level);
  if (!meta) return null;
  const slug = `${track}-l${level}`;
  const path = join(WRITEUPS_DIR, `${slug}.md`);
  const raw = await readFile(path, "utf8").catch(() => null);
  if (!raw) return null;
  const { body } = parseFrontMatter(raw);
  const html = await marked.parse(body, { gfm: true, breaks: false });
  return { ...meta, html: typeof html === "string" ? html : await html };
}
