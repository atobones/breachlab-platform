import type { TrackCertificate } from "@/lib/certificate/queries";
import { operativeSerial } from "@/lib/certificate/serial";
import { CertificateSeal } from "./CertificateSeal";

const SKILLS = [
  "Sudo abuse — env_keep, wildcard injection, sudoedit bypass",
  "Linux capabilities — cap_setuid, cap_dac_read_search, cap_sys_ptrace",
  "Local authentication service exploitation (polkit class)",
  "Writable authority files — passwd, sudoers.d, cron",
  "Container escape — docker socket, privileged flag, runtime CVEs",
  "Kubernetes pod escape — hostPath, hostPID, nsenter chain",
  "Kubectl-free cluster pivot and cloud metadata handoff",
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function PhantomCertificate({ cert }: { cert: TrackCertificate }) {
  const serial = operativeSerial(cert.userId, cert.trackId, cert.awardedAt, "PHNM");
  const date = formatDate(cert.awardedAt);
  const verifyUrl = `https://breachlab.org/u/${cert.username}/certificate/phantom`;

  return (
    <article
      data-testid="phantom-certificate"
      className="border-2 border-red bg-bg text-text font-mono p-8 max-w-3xl mx-auto shadow-[0_0_30px_rgba(239,68,68,0.2)]"
    >
      <div className="text-center space-y-1">
        {/* See OperativeCertificate: tracking only on the word, not the
            ━━━ box-drawing rule chars. */}
        <p className="text-xs text-red flex items-center justify-center gap-3">
          <span aria-hidden="true">━━━</span>
          <span className="tracking-[0.4em]">CLASSIFIED — OPERATIONAL</span>
          <span aria-hidden="true">━━━</span>
        </p>
        {/* Inline styles survive html-to-image's DOM-clone step reliably;
            Tailwind's whitespace-pre / leading-[1.15] / font-mono were being
            dropped during PNG rasterization, collapsing multi-spaces and
            breaking the ASCII logo. See OperativeCertificate for details. */}
        <pre
          style={{
            whiteSpace: "pre",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            lineHeight: 1.15,
          }}
          className="font-mono text-red text-[10px] select-none overflow-x-auto"
        >
{` ____  _   _    _    _   _ _____ ___  __  __
|  _ \\| | | |  / \\  | \\ | |_   _/ _ \\|  \\/  |
| |_) | |_| | / _ \\ |  \\| | | || | | | |\\/| |
|  __/|  _  |/ ___ \\| |\\  | | || |_| | |  | |
|_|   |_| |_/_/   \\_\\_| \\_| |_| \\___/|_|  |_|
                OPERATIVE`}
        </pre>
        <p className="text-[11px] tracking-[0.4em] text-muted">
          POST-EXPLOITATION CERTIFICATION — PHANTOM TRACK
        </p>
      </div>

      <div className="my-6 border-t border-red/30" />

      <div className="grid grid-cols-[1fr_auto] gap-6 items-start">
        <div className="space-y-4">
          <p className="text-xs text-muted uppercase tracking-wider">
            This document certifies that
          </p>
          <h1 className="text-3xl text-red tracking-wide break-all">
            @{cert.username}
          </h1>
          <p className="text-sm leading-relaxed max-w-prose">
            has completed the <span className="text-red">Phantom</span> track
            in full — thirty-one public levels plus the classified graduation
            chain — and is hereby recognized as a{" "}
            <span className="text-red font-bold">
              BreachLab Phantom Operative
            </span>
            . The holder has demonstrated end-to-end post-exploitation
            tradecraft on modern Linux and container infrastructure, including
            privilege escalation, persistence, lateral movement, container
            escape, and Kubernetes cluster compromise — and is field-ready
            for offensive security engagements.
          </p>
        </div>
        <CertificateSeal
          verifyUrl={verifyUrl}
          color="#ef4444"
          labelClass="text-red"
          borderClass="border-red/40"
        />
      </div>

      <section className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">
            Call sign
          </div>
          <div className="text-red">@{cert.username}</div>
        </div>
        <div>
          <div className="text-xs text-muted uppercase tracking-wider">
            Serial
          </div>
          <div className="text-red">{serial}</div>
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
              <span className="text-red">▸</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 border border-red/30 p-4 text-xs italic text-muted">
        &ldquo;Ghost was selection. Phantom was training. This is graduation.
        The real work starts now.&rdquo;
      </section>

      <section className="mt-8 grid grid-cols-2 gap-6 text-xs">
        <div>
          <div className="border-t border-red/50 pt-2">BreachLab Command</div>
          <div className="text-muted">Operator certification authority</div>
        </div>
        <div>
          <div className="border-t border-red/50 pt-2">{date}</div>
          <div className="text-muted">Date of issue · irrevocable</div>
        </div>
      </section>

      <div className="mt-6 text-center">
        <p className="text-[10px] text-muted flex items-center justify-center gap-3">
          <span aria-hidden="true">━━━</span>
          <span className="tracking-[0.4em]">END OF DOCUMENT</span>
          <span aria-hidden="true">━━━</span>
        </p>
        <p className="text-[10px] tracking-[0.2em] text-muted mt-1">
          Verify at breachlab/u/{cert.username}/certificate/phantom · serial{" "}
          {serial}
        </p>
      </div>
    </article>
  );
}
