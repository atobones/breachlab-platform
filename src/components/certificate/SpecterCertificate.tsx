import type { TrackCertificate } from "@/lib/certificate/queries";
import { operativeSerial } from "@/lib/certificate/serial";
import { CertificateSeal } from "./CertificateSeal";

const SKILLS = [
  "Berkeley Protocol-aligned chain-of-custody across heterogeneous artifacts",
  "Source-family independence — ≥2 family corroboration per court-admissible finding",
  "Daubert-survivable methodology appendix discipline",
  "Bi-directional source-protection redaction without breaking logical connectivity",
  "Legal-tier cross-pollination ceiling — laundering refusal under FRE 901",
  "Counter-OSINT plant detection across forum / archive / pastebin surfaces",
  "Sock-puppet attribution OPSEC under cred-required engagement surface",
  "Engagement-letter renegotiation under newly discovered facts (Berkeley §V.B)",
  "Bias / uncertainty preservation register with named-rejected alternatives",
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function SpecterCertificate({ cert }: { cert: TrackCertificate }) {
  const serial = operativeSerial(cert.userId, cert.trackId, cert.awardedAt, "SPCT");
  const date = formatDate(cert.awardedAt);
  const verifyUrl = `https://breachlab.org/u/${cert.username}/certificate/specter`;

  return (
    <article
      data-testid="specter-certificate"
      className="border-2 border-green bg-bg text-text font-mono p-4 sm:p-8 max-w-3xl mx-auto shadow-[0_0_30px_rgba(34,197,94,0.2)] overflow-hidden"
    >
      <div className="text-center space-y-1">
        <p className="text-xs tracking-[0.4em] text-green">
          ━━━ CHAIN OF CUSTODY — PRESERVED ━━━
        </p>
        {/* Inline-style pre to survive html-to-image DOM-clone step (same
            mobile-scroll pattern as PhantomCertificate). */}
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <pre
            style={{
              whiteSpace: "pre",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              lineHeight: 1.15,
              textAlign: "left",
              display: "inline-block",
            }}
            className="font-mono text-green text-[10px] select-none"
          >
{` ____  ____  _____ ____ _____ _____ ____
/ ___||  _ \\| ____/ ___|_   _| ____|  _ \\
\\___ \\| |_) |  _|| |     | | |  _| | |_) |
 ___) |  __/| |__| |___  | | | |___|  _ <
|____/|_|   |_____\\____| |_| |_____|_| \\_\\
                  ANALYST`}
          </pre>
        </div>
        <p className="text-[11px] tracking-[0.4em] text-muted">
          OPEN-SOURCE INVESTIGATIVE CERTIFICATION — SPECTER TRACK
        </p>
      </div>

      <div className="my-6 border-t border-green/30" />

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-4 min-w-0">
          <p className="text-xs text-muted uppercase tracking-wider">
            This document certifies that
          </p>
          <h1 className="text-2xl sm:text-3xl text-green tracking-wide break-all">
            @{cert.username}
          </h1>
          <p className="text-sm leading-relaxed max-w-prose">
            has completed the <span className="text-green">Specter</span> track
            in full — fourteen public levels closing with a Berkeley
            Protocol-aligned court-admissible investigative report — and is
            hereby recognized as a{" "}
            <span className="text-green font-bold">
              BreachLab Specter Analyst
            </span>
            . The holder has demonstrated end-to-end open-source intelligence
            tradecraft to a standard that survives Daubert challenge,
            FRE 901 authentication, journalist editorial review, GC sign-off,
            and ICC OTP intake — and is field-ready for OSINT engagements
            on behalf of journalism, prosecution, and human-rights
            accountability.
          </p>
        </div>
        <CertificateSeal
          verifyUrl={verifyUrl}
          color="#22c55e"
          labelClass="text-green"
          borderClass="border-green/40"
        />
      </div>

      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">
            Call sign
          </div>
          <div className="text-green">@{cert.username}</div>
        </div>
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">
            Serial
          </div>
          <div className="text-green">{serial}</div>
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
              <span className="text-green">▸</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 border border-green/30 p-4 text-xs italic text-muted">
        &ldquo;Methodology survives adversarial review. The discipline is
        the level.&rdquo;
      </section>

      <section className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
        <div>
          <div className="border-t border-green/50 pt-2">BreachLab Command</div>
          <div className="text-muted">Operator certification authority</div>
        </div>
        <div>
          <div className="border-t border-green/50 pt-2">{date}</div>
          <div className="text-muted">Date of issue · irrevocable</div>
        </div>
      </section>

      <div className="mt-6 text-center">
        <p className="text-[10px] tracking-[0.4em] text-muted">
          ━━━ END OF DOCUMENT ━━━
        </p>
        <p className="text-[10px] tracking-[0.2em] text-muted mt-1">
          Verify at breachlab/u/{cert.username}/certificate/specter · serial{" "}
          {serial}
        </p>
      </div>
    </article>
  );
}
