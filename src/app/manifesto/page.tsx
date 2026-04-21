import Link from "next/link";

export const metadata = {
  title: "Manifesto — BreachLab",
  description:
    "Why BreachLab exists, what it isn't, and who it's for.",
};

export default function ManifestoPage() {
  return (
    <article className="space-y-8 max-w-2xl" data-testid="manifesto-page">
      <header className="space-y-3">
        <h1 className="text-amber text-3xl phosphor wordmark">
          <span className="glitch" data-text="Manifesto">Manifesto</span>
        </h1>
      </header>

      <section className="space-y-4 text-sm leading-relaxed text-text">
        <p>
          Corporate cybersecurity certifications cost{" "}
          <span className="text-amber">$1,600 to $5,000</span>. They teach
          you to pass tests, not to break into systems.
        </p>
        <p>
          Anonymous didn&apos;t learn from a curriculum. Phineas Fisher
          didn&apos;t get certified. The kids who own bug bounty
          leaderboards today learned the same way the previous generation
          did — broken servers, raw shells, nights spent reading{" "}
          <code>man pages</code> and <code>/etc/shadow</code>.
        </p>
        <p>
          There&apos;s no place online right now that teaches like that.
          HackTheBox gamified it. TryHackMe turned it into a course.
          OffSec turned it into a $2,000 exam.
        </p>
        <p className="text-amber">
          So we&apos;re building one.
        </p>
      </section>

      <hr className="ascii-rule" />

      <section className="space-y-3">
        <h2 className="text-green text-sm uppercase tracking-wider">
          What BreachLab is
        </h2>
        <ul className="text-sm space-y-2 list-none pl-0">
          <li>
            <span className="text-green">+</span> A persistent server with
            real vulnerable Linux boxes you SSH into and try to root.
          </li>
          <li>
            <span className="text-green">+</span> Free. No signup. No paywall.
            No certification fee.
          </li>
          <li>
            <span className="text-green">+</span> Resource links per level —
            then you figure it out.
          </li>
          <li>
            <span className="text-green">+</span> A community of operatives,
            not a customer base of students.
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-red text-sm uppercase tracking-wider">
          What BreachLab is not
        </h2>
        <ul className="text-sm space-y-2 list-none pl-0">
          <li>
            <span className="text-red">−</span> Not a multiple choice quiz.
          </li>
          <li>
            <span className="text-red">−</span> Not a curriculum, not a
            course, not a bootcamp.
          </li>
          <li>
            <span className="text-red">−</span> Not a CTF — flags here are
            real shell passwords on real machines.
          </li>
          <li>
            <span className="text-red">−</span> Not a place that hands you
            walkthroughs. If you want a YouTube tutorial, this isn&apos;t it.
          </li>
        </ul>
      </section>

      <hr className="ascii-rule" />

      <section className="space-y-4 text-sm leading-relaxed">
        <h2 className="text-amber text-sm uppercase tracking-wider">
          Who this is for
        </h2>
        <p>
          Operators. People who would rather get stuck for six hours and
          figure something out than be told the answer in three minutes.
          People who understand that the only way you actually learn this
          craft is by doing it on systems that fight back.
        </p>
        <p>
          If you&apos;re tired of multiple choice quizzes and want to learn
          the way attackers actually learn — there&apos;s a server waiting:
        </p>
        <pre className="text-amber">
{`ssh ghost0@play.breachlab.org -p 2222
password: ghost0`}
        </pre>
        <p className="text-xs text-muted">
          The first 100 graduates of <span className="text-red">Phantom</span>{" "}
          or any pro track beyond it receive permanent{" "}
          <Link href="/founding" className="text-amber hover:underline">
            Founding Operative
          </Link>{" "}
          status. Ghost is the entry exam — it doesn&rsquo;t claim a seat.
          When the next generation looks back at where this started — your
          handle is on the wall.
        </p>
      </section>

      <hr className="ascii-rule" />

      <footer className="space-y-2 text-xs text-muted">
        <p>
          <span className="text-amber">→</span>{" "}
          <Link href="/" className="text-amber hover:underline">
            All 13 tracks
          </Link>
        </p>
        <p>
          <span className="text-amber">→</span>{" "}
          <Link href="/founding" className="text-amber hover:underline">
            Founding Operatives roster
          </Link>
        </p>
        <p>
          <span className="text-amber">→</span>{" "}
          <a
            href="https://discord.gg/hJrteuV6"
            className="text-amber hover:underline"
            rel="noreferrer"
          >
            Join the operatives on Discord
          </a>
        </p>
      </footer>
    </article>
  );
}
