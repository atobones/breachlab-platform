import { NextResponse } from "next/server";

import { getReplayById } from "@/lib/koth/replays";

// GET /api/koth/replay/[id]/raw — serves the raw asciinema v2 cast text.
//
// Public on purpose: replays are race-the-ghost artifacts. Anyone can
// pull the .cast file and either replay it locally with the asciinema
// CLI (`asciinema play file.cast`) or feed it back into our ghost-race
// mode (Phase C). No auth.
//
// We set Content-Type: application/x-asciicast (the format's registered
// MIME) plus a Content-Disposition that defaults to a friendly filename
// containing the slot + recorded date for downloads.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // UUID shape guard — keep the SQL pre-validated.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }

  const replay = await getReplayById(id);
  if (!replay) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const filename = `koth-${replay.actorSlot}-${replay.recordedAt
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19)}.cast`;

  return new NextResponse(replay.asciicast, {
    status: 200,
    headers: {
      "Content-Type": "application/x-asciicast; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      // Asciicast files are immutable once uploaded — cache aggressively
      // at the edge. The id is a uuid so the cache key is unique.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
