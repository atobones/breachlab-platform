import { NextRequest } from "next/server";

import { currentCrownHolder, currentRoundId, recentAudit } from "@/lib/koth/audit";

// Crown Wars — Live Audit Feed SSE.
//
// Client opens an EventSource here; we push the last N events on
// connect, then poll-tail every ~2s and push deltas. Filtered to the
// current crown holder by default so the stream reads as "what the
// king is doing right now". Explicit ?actor=<uuid> overrides.
//
// We use poll-tail (not LISTEN/NOTIFY) because: (a) the surface is
// tiny (sidecar pushes batches; we don't expect >5 inserts/sec on a
// busy round), (b) it requires no extra infrastructure beyond what
// Drizzle already gives us, and (c) it cleanly degrades to "tail
// next time" on transient DB hiccups.

export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 2000;
const MAX_STREAM_SECONDS = 10 * 60; // disconnect after 10 minutes

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const explicitActor = url.searchParams.get("actor");
  const limit = Math.min(
    200,
    Math.max(10, Number(url.searchParams.get("limit") ?? "60") || 60),
  );

  const roundId = await currentRoundId();
  if (!roundId) {
    return new Response("event: idle\ndata: no-active-round\n\n", {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  // Resolve target actor — explicit override or current crown holder.
  let targetActorId: string | null = null;
  if (explicitActor) {
    targetActorId = explicitActor;
  } else {
    const holder = await currentCrownHolder(roundId);
    targetActorId = holder?.userId ?? null;
  }

  const encoder = new TextEncoder();
  const start = Date.now();
  let lastId = 0;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        const payload =
          typeof data === "string" ? data : JSON.stringify(data);
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${payload}\n\n`),
        );
      };

      // Initial paint — newest events first → reversed to chrono.
      const seed = await recentAudit({
        roundId,
        actorUserId: targetActorId,
        limit,
      });
      lastId = seed.length > 0 ? Math.max(...seed.map((r) => r.id)) : 0;
      send("seed", {
        roundId,
        targetActorId,
        events: seed.map((e) => ({
          id: e.id,
          ts: e.occurredAt.toISOString(),
          klass: e.syscallClass,
          summary: e.summary,
          username: e.actorUsername,
          slot: e.actorSlot,
        })),
      });

      // Periodic delta push. Stops when the request is aborted (client
      // disconnect) or we hit the wallclock ceiling.
      let aborted = false;
      const onAbort = () => {
        aborted = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", onAbort);

      while (!aborted) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        if (aborted) break;
        if ((Date.now() - start) / 1000 > MAX_STREAM_SECONDS) {
          send("bye", { reason: "max-stream-duration" });
          try {
            controller.close();
          } catch {
            // ignore
          }
          break;
        }
        try {
          // Re-resolve target actor every cycle so the stream follows
          // the crown across king rotations. Cheap query.
          if (!explicitActor) {
            const holder = await currentCrownHolder(roundId);
            const newId = holder?.userId ?? null;
            if (newId !== targetActorId) {
              targetActorId = newId;
              // Reset tail — new actor means new lineage.
              lastId = 0;
              send("crown-rotated", { targetActorId });
            }
          }
          const delta = await recentAudit({
            roundId,
            actorUserId: targetActorId,
            sinceId: lastId,
            limit: 100,
          });
          if (delta.length > 0) {
            lastId = Math.max(...delta.map((r) => r.id));
            send("delta", {
              events: delta.map((e) => ({
                id: e.id,
                ts: e.occurredAt.toISOString(),
                klass: e.syscallClass,
                summary: e.summary,
                username: e.actorUsername,
                slot: e.actorSlot,
              })),
            });
          } else {
            // keep-alive comment so intermediaries don't reap idle conns
            controller.enqueue(encoder.encode(": keep-alive\n\n"));
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          send("error", { msg });
        }
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
