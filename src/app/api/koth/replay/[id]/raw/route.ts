import { NextResponse } from "next/server";

// GET /api/koth/replay/[id]/raw — formerly served the raw asciinema v2
// cast text. Disabled because the on-disk cast contains arena-internal
// paths (decoy stub, drift-arena script, recording wrapper) that we
// redact at render time in /battles/koth/replay/[id]. Exposing the
// raw bytes here would route around that filter.
//
// The transcript view reads `koth_replays.asciicast` directly from
// the DB and parses + redacts server-side. There's no remaining
// consumer for this endpoint. Returning 410 Gone (not 404) so any
// stale links or bookmarks get a clear signal it isn't coming back.

export async function GET() {
  return NextResponse.json(
    {
      error:
        "raw cast download disabled — view the transcript at /battles/koth/replay/[id]",
    },
    { status: 410 },
  );
}
