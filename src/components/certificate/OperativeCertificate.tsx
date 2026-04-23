import type { GhostCertificate } from "@/lib/certificate/queries";
import { operativeSerial } from "@/lib/certificate/serial";
import { CertificateSeal } from "./CertificateSeal";

const SKILLS = [
  "Shell forensics · file discovery · permission analysis",
  "Network reconnaissance · banner grabbing · TLS handshake",
  "Encoding pivots · multi-layer payload extraction",
  "SSH key authentication · bashrc bypass · restricted shells",
  "Cron auditing · SUID abuse · filesystem privilege gradients",
  "Git history forensics · leaked-secret recovery",
  "Script-driven brute force · service protocol fuzzing",
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function OperativeCertificate({ cert }: { cert: GhostCertificate }) {
  const serial = operativeSerial(cert.userId, cert.trackId, cert.awardedAt);
  const date = formatDate(cert.awardedAt);
  const verifyUrl = `https://breachlab.org/u/${cert.username}/certificate/ghost`;

  return (
    <article
      data-testid="operative-certificate"
      className="border-2 border-amber bg-bg text-text font-mono p-8 max-w-3xl mx-auto shadow-[0_0_30px_rgba(245,158,11,0.15)]"
    >
      <div className="text-center space-y-1">
        <p className="text-xs tracking-[0.4em] text-amber">
          ━━━ CLASSIFIED ━━━
        </p>
        {/* Inline whiteSpace/fontFamily/lineHeight on <pre>: html-to-image
            clones the DOM and some Tailwind arbitrary-value utilities
            (`whitespace-pre`, `leading-[1.15]`, `font-mono`) don't always
            survive the computed-style copy inside the PNG rasterizer —
            downloaded certificates arrived with multi-spaces collapsed so
            the BREACHLAB ASCII logo rendered narrow and overlapping
            (defstrong bug report 2026-04-23). Inline styles are respected
            by html-to-image unconditionally. */}
        <pre
          style={{
            whiteSpace: "pre",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            lineHeight: 1.15,
            textAlign: "left",
            display: "inline-block",
          }}
          className="font-mono text-amber text-[10px] select-none overflow-x-auto"
        >
{` ____  ____  _____    _    ____ _   _ _        _    ____
| __ )|  _ \\| ____|  / \\  / ___| | | | |      / \\  | __ )
|  _ \\| |_) |  _|   / _ \\| |   | |_| | |     / _ \\ |  _ \\
| |_) |  _ <| |___ / ___ \\ |___|  _  | |___ / ___ \\| |_) |
|____/|_| \\_\\_____/_/   \\_\\____|_| |_|_____/_/   \\_\\____/`}
        </pre>
        <p className="text-[11px] tracking-[0.4em] text-muted">
          OPERATIVE CERTIFICATION — GHOST TRACK
        </p>
      </div>

      <div className="my-6 border-t border-amber/30" />

      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-4">
          <p className="text-xs text-muted uppercase tracking-wider">
            This document certifies that
          </p>
          <h1 className="text-3xl text-amber tracking-wide break-all">
            @{cert.username}
          </h1>
          <p className="text-sm leading-relaxed max-w-prose">
            has completed the <span className="text-amber">Ghost</span> track
            in full — twenty-two public levels and the classified
            graduation gate — and is hereby recognized as a{" "}
            <span className="text-amber font-bold">
              BreachLab Ghost Operative
            </span>
            . The holder has demonstrated operational proficiency across the
            full Linux exploitation surface required of every modern security
            specialist.
          </p>
        </div>
        <CertificateSeal
          verifyUrl={verifyUrl}
          color="#f59e0b"
          labelClass="text-amber"
          borderClass="border-amber/40"
        />
      </div>

      <section className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">
            Call sign
          </div>
          <div className="text-amber">@{cert.username}</div>
        </div>
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">
            Serial
          </div>
          <div className="text-amber">{serial}</div>
        </div>
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">
            Track
          </div>
          <div>{cert.trackName}</div>
        </div>
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">
            Date of graduation
          </div>
          <div>{date}</div>
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <div className="text-xs text-muted uppercase tracking-wider">
          Demonstrated competencies
        </div>
        <ul className="text-xs space-y-1">
          {SKILLS.map((s) => (
            <li key={s} className="flex gap-2">
              <span className="text-amber">▸</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 border border-amber/30 p-4 text-xs italic text-muted">
        &ldquo;Ghost was selection. This is graduation. Clear this and you are
        no longer a beginner — you are an operative. Every future BreachLab
        track is open to you. The real work starts now.&rdquo;
      </section>

      <section className="mt-8 grid grid-cols-2 gap-6 text-xs">
        <div>
          <div className="border-t border-amber/50 pt-2">
            BreachLab Command
          </div>
          <div className="text-muted">Operator certification authority</div>
        </div>
        <div>
          <div className="border-t border-amber/50 pt-2">
            {date}
          </div>
          <div className="text-muted">Date of issue · irrevocable</div>
        </div>
      </section>

      <div className="mt-6 text-center">
        <p className="text-[10px] tracking-[0.4em] text-muted">
          ━━━ END OF DOCUMENT ━━━
        </p>
        <p className="text-[10px] tracking-[0.2em] text-muted mt-1">
          Verify at breachlab/u/{cert.username}/certificate · serial {serial}
        </p>
      </div>
    </article>
  );
}
