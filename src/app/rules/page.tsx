export const metadata = {
  title: "Rules — BreachLab",
};

export default function RulesPage() {
  return (
    <article className="space-y-6 max-w-3xl">
      <header className="space-y-2">
        <div className="text-[10px] text-amber/80 tracking-[0.4em] uppercase font-mono">
          ▸ ops doctrine
        </div>
        <h1 className="text-amber text-2xl sm:text-3xl phosphor wordmark font-bold tracking-[0.08em]">
          RULES
        </h1>
      </header>

      <p className="text-[14px] leading-relaxed">
        BreachLab is a free training ground for operators learning real
        offensive and defensive security tradecraft. The labs stay open
        because operators behave like operators. Five things keep it
        that way.
      </p>

      <section className="space-y-3">
        <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ─ standing orders
        </h2>
        <ol className="list-decimal list-outside pl-5 space-y-3 text-[13px] leading-relaxed">
          <li>
            <strong>Respect the other operators in the lab.</strong>
            {" "}Harassment, discrimination, or bad-faith conduct gets
            you removed. No grey area. The community is the asset; we
            protect it first.
          </li>
          <li>
            <strong>Don&apos;t spoil active operations.</strong> Other
            people are mid-level when you&apos;re past it. If someone
            asks for help, take it to DM. The chatrooms are mirrored
            across surfaces and spoiler tags don&apos;t survive — write
            for the lowest-trust channel.
          </li>
          <li>
            <strong>Don&apos;t poison the shared environment.</strong>
            {" "}Cryptic filenames, junk in <code>/tmp</code>, half-
            finished payloads left in shared dirs — they confuse the
            next operator on the box. Clean up your traces when you
            close out. The labs are shared infrastructure, not your
            scratch space.
          </li>
          <li>
            <strong>No brute force against levels or the platform.</strong>
            {" "}Automated guessing on level passwords, flag submission,
            or the SSH ingress is out of bounds. The point is to read
            the system, not flood it. We rate-limit and you&apos;ll get
            caught fast.
          </li>
          <li>
            <strong>No attacks on the platform itself.</strong> The
            wargames are the target. The web platform, the host, the
            database, the oracle endpoints, other operators&apos;
            accounts — out of scope. Find a real vuln there? DM @ato
            and you&apos;ll get a Hall-of-Fame slot.
          </li>
        </ol>
      </section>

      <section className="space-y-3 border-t border-border/40 pt-5">
        <h2 className="text-amber text-sm font-mono tracking-[0.18em] uppercase">
          ─ writeups · educators · content creators
        </h2>
        <ol className="list-decimal list-outside pl-5 space-y-3 text-[13px] leading-relaxed">
          <li>
            <strong>
              Never publish level passwords or flag values.
            </strong>{" "}
            Writeups, walkthroughs, videos — all welcome and encouraged.
            But every published credential cheapens the level for the
            next thousand operators. Teach the technique, not the
            answer.
          </li>
          <li>
            <strong>If your content makes money, send some back.</strong>
            {" "}BreachLab runs on donations. If a Ghost or Phantom or
            Specter writeup made you ad revenue or course sales, the{" "}
            <a href="/donate" className="text-amber">
              donate page
            </a>{" "}
            is right there. We don&apos;t enforce this — but operators
            who do it move up the ladder.
          </li>
          <li>
            <strong>Credit BreachLab when you use the lab.</strong>{" "}
            A link back, a name-drop in the video description, a
            sentence in the writeup&apos;s intro. Same energy we extend
            to upstream projects we draw inspiration from.
          </li>
        </ol>
      </section>

      <p className="text-[12px] text-muted pt-4 border-t border-border/40">
        Using BreachLab means you&apos;ve read these and you&apos;re in.
        We don&apos;t make you click a checkbox.
      </p>
    </article>
  );
}
