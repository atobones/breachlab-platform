/**
 * Detects writes to security-sensitive tables that did NOT come from the
 * platform's own connection pool. Reads security_writes_log (populated by
 * the trigger in drizzle/0011_security_writes_audit.sql) and flags rows
 * where application_name is anything other than 'breachlab-platform'.
 *
 * Run periodically via systemd (scripts/systemd/breachlab-audit-alarm.*).
 * Optional Discord webhook posts the finding to ops if any rows match.
 *
 * Exits 1 on suspicious rows (so cron / systemd can alert), 0 on clean.
 */

import postgres from "postgres";

const PLATFORM_APP_NAME = "breachlab-platform";

// Look back this many minutes by default. Pass `--window=N` to override.
// The systemd timer fires every 15min and this defaults to 60min so each
// run includes some overlap — out-of-band writes will be reported on three
// consecutive cycles before scrolling out of the window.
const DEFAULT_WINDOW_MINUTES = 60;

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const a = process.argv.find((x) => x.startsWith(prefix));
  return a ? a.slice(prefix.length) : undefined;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");

  const windowMin = Number(parseArg("window")) || DEFAULT_WINDOW_MINUTES;
  const sql = postgres(url, {
    connection: { application_name: "breachlab-audit-alarm" },
  });

  type Row = {
    id: string;
    table_name: string;
    op: string;
    row_pk: string | null;
    session_user: string;
    application_name: string | null;
    client_addr: string | null;
    app_audit_actor: string | null;
    created_at: Date;
  };

  const rows = (await sql`
    SELECT id, table_name, op, row_pk, session_user,
           application_name, client_addr::text AS client_addr,
           app_audit_actor, created_at
    FROM security_writes_log
    WHERE created_at > now() - (${windowMin}::int * interval '1 minute')
      AND (application_name IS DISTINCT FROM ${PLATFORM_APP_NAME})
    ORDER BY created_at DESC
    LIMIT 200
  `) as unknown as Row[];

  if (rows.length === 0) {
    console.log(
      `[audit-alarm] clean — no out-of-band writes in last ${windowMin}m`,
    );
    await sql.end();
    process.exit(0);
  }

  console.error(
    `[audit-alarm] FOUND ${rows.length} out-of-band write(s) in last ${windowMin}m:`,
  );
  for (const r of rows) {
    console.error(
      `  ${r.created_at.toISOString()}  ${r.op.padEnd(7)}  ${r.table_name}#${r.row_pk ?? "?"}  ` +
        `app="${r.application_name ?? "(null)"}"  user=${r.session_user}  ` +
        `addr=${r.client_addr ?? "unix"}  actor=${r.app_audit_actor ?? "(null)"}`,
    );
  }

  const webhook = process.env.AUDIT_ALARM_DISCORD_WEBHOOK;
  if (webhook) {
    const top = rows.slice(0, 5).map((r) =>
      `\`${r.created_at.toISOString()}\` **${r.op}** \`${r.table_name}\` ` +
        `app=\`${r.application_name ?? "(null)"}\` user=\`${r.session_user}\``,
    ).join("\n");
    const body = {
      content:
        `:rotating_light: **Out-of-band DB write detected** ` +
        `(${rows.length} in last ${windowMin}m) — ` +
        `application_name != \`${PLATFORM_APP_NAME}\`\n${top}` +
        (rows.length > 5 ? `\n_(+${rows.length - 5} more — see security_writes_log)_` : ""),
    };
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        console.error(`[audit-alarm] discord post failed: ${res.status}`);
      }
    } catch (e) {
      console.error(`[audit-alarm] discord post error: ${(e as Error).message}`);
    }
  }

  await sql.end();
  process.exit(1);
}

main().catch((e) => {
  console.error("[audit-alarm] fatal:", e);
  process.exit(2);
});
