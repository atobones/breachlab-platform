import Link from "next/link";
import { DISCORD_INVITE_URL } from "@/lib/links";

const BLOCKS = [
  {
    name: "Phishing Infrastructure",
    pitch:
      "Site cloning, payload-in-document, SPF/DKIM/DMARC bypass tradecraft, GoPhish campaign orchestration, redirector + burner-domain hygiene. The technical scaffolding behind a credible inbox-first attack.",
  },
  {
    name: "Pretexting",
    pitch:
      "Build a cover story that survives a security-aware target. Vendor-support, IT-helpdesk, recruiter and journalist personas — each with its own jargon, escalation path, and tell-tale slips graders look for.",
  },
  {
    name: "Vishing",
    pitch:
      "Voice-side operations on simulated phone calls and Discord voice transcripts. IVR navigation, urgency framing, authority impersonation, recovery from suspicion. Three-call ceiling forces decisive tradecraft.",
  },
  {
    name: "Elicitation",
    pitch:
      "Extract information without ever asking the direct question. Loftus questioning, leading statements, false-confession baiting, mirroring, calibrated incompetence. Five-message conversations against trained marks.",
  },
  {
    name: "Baiting & USB Drops",
    pitch:
      "Drop placement strategy, malicious file-naming psychology, payload selection — Rubber Ducky, Bash Bunny, LNK chains. Decoy dropouts (cleaning staff, security officer pickups) punish careless placement.",
  },
  {
    name: "Detection Awareness",
    pitch:
      "Read the defensive side. What tells a real SOC that a conversation is hostile — timing, language patterns, jargon gaps, escalation requests. Same skill set, mirrored — to attack better, and to defend at all.",
  },
];

export default function SpecterIVPage() {
  return (
    <div className="space-y-10 max-w-3xl">
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <h1 className="text-amber text-2xl">
            Specter IV — Social Engineering &amp; Human Operations
          </h1>
          <span className="text-xs uppercase tracking-wider px-2 py-0.5 border border-muted text-muted">
            Planned
          </span>
        </div>
        <p className="text-sm text-muted">
          Eight levels. The oldest attack surface there is — the human in
          front of the screen, the phone, or the badge reader.
        </p>
      </header>

      <section className="space-y-3">
        <p className="text-sm">
          Seventy-plus percent of real breaches start with a human getting
          asked the right question by the right person at the right moment.
          Every other Specter sub-track teaches the technical wire; this one
          teaches the conversation that gets you to the technical wire in the
          first place.
        </p>
        <p className="text-sm">
          Every target on Specter IV is an LLM-driven simulated mark with a
          scripted persona — background, beliefs, current emotional state,
          security-awareness level, internal jargon dictionary, and
          allowed-versus-forbidden-intel boundaries. You craft a pretext, run
          a conversation through email, chat, or voice transcript, and try to
          exfiltrate intel before the mark&apos;s suspicion crosses the alarm
          line. The mark grades you on four axes — credibility, disclosure,
          trust delta, detection probability — same server-side grading
          discipline as the rest of Specter.
        </p>
        <p className="text-sm text-muted">
          No real humans are targeted on the platform. Every brief opens with
          an ethics statement: the techniques you learn here apply only to
          authorised engagements with explicit consent.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-amber text-lg">What it covers</h2>
        <ul className="space-y-3 text-sm">
          {BLOCKS.map((b) => (
            <li key={b.name} className="border-l-2 border-border pl-3">
              <strong className="text-amber">{b.name}.</strong>{" "}
              <span className="text-muted">{b.pitch}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-amber text-lg">Why this is unique</h2>
        <ul className="space-y-3 text-sm">
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">No public wargame grades SE conversations end-to-end.</strong>{" "}
            HackTheBox, TryHackMe, OffSec all have one or two SE-flavoured
            challenges; none of them simulate a multi-turn dialogue with a
            target who scores you on credibility and pushes back when your
            pretext slips.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">The OSINT from Specter I plugs in directly.</strong>{" "}
            The personas, jargon, and target intel you mined in I become the
            ammunition you load here. Vertical integration across sub-tracks
            is the design.
          </li>
          <li className="border-l-2 border-amber pl-3">
            <strong className="text-amber">Defensive perspective is graded too.</strong>{" "}
            Every offensive level ends with a debrief asking what a trained
            SOC analyst would have caught — the same rubric your conversation
            was graded against. Operatives leave able to attack and to defend.
          </li>
        </ul>
      </section>

      <section className="space-y-3 border border-border p-4">
        <h2 className="text-amber text-lg">Status</h2>
        <p className="text-sm">
          Design begins after Specter II ships. The LLM-driven NPC harness is
          a new platform-wide capability — once it lands, it unlocks future
          tracks that involve graded human interaction (negotiation,
          influence operations, insider-threat detection).
        </p>
      </section>

      <footer className="border-t border-border pt-4 space-y-2">
        <p className="text-sm">
          <a
            href={DISCORD_INVITE_URL}
            className="text-amber hover:underline"
            rel="noreferrer"
          >
            Join the Discord
          </a>{" "}
          for ship-date announcements.
        </p>
        <p className="text-xs text-muted">
          <Link href="/tracks/specter" className="text-amber hover:underline">
            ← Back to Specter overview
          </Link>
        </p>
      </footer>
    </div>
  );
}
