import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-amber text-2xl">Need help?</h1>

      <section className="space-y-3">
        <p className="text-sm">
          It is normal to get stuck on a level from time to time.
        </p>
        <p className="text-sm">
          Before reaching out for help, make sure you have read the level
          README carefully. If you are still stuck, you can ask in the
          chatrooms — but remember to follow the{" "}
          <Link href="/rules" className="text-amber hover:underline">
            rules
          </Link>
          . Do not share flags or solutions.
        </p>
        <p className="text-sm text-muted">
          If you don&apos;t know how to use a command, try{" "}
          <code className="text-amber">man &lt;command&gt;</code> or use a
          search engine to find out.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Flags</h2>
        <p className="text-sm">
          The flag you submit for level N is{" "}
          <span className="text-amber">
            the same chain password you used to <code>ssh</code> into level N+1
          </span>
          . Solve the level, recover the secret (it is almost always a
          file somewhere on the box), paste it on{" "}
          <a href="/submit" className="text-amber">/submit</a> for points.
        </p>
        <p className="text-sm text-muted">
          The last level of each track ends at a graduation token (e.g.{" "}
          <code>Gh0st_0p3r4t1v3</code>) — that one is the flag for the
          final level and has no next-level SSH use.
        </p>
        <p className="text-sm text-muted">
          Case-sensitive. Whitespace is trimmed.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">First Blood</h2>
        <p className="text-sm">
          The <em>first</em> operative to submit a correct flag for a level
          gets a bonus on top of the base points (usually{" "}
          <code>+50</code>). After that, the first-blood slot is taken for
          good — everyone else only earns the base points for that level.
        </p>
        <p className="text-sm text-muted">
          You can see who holds first blood for every level on the track
          page. Red <code>FIRST BLOOD AVAILABLE</code> means it is still
          up for grabs.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Discord</h2>
        <p className="text-sm">
          You can find our Discord server at{" "}
          <a
            href="https://discord.gg/hJrteuV6"
            className="text-amber hover:underline"
            rel="noreferrer"
          >
            https://discord.gg/hJrteuV6
          </a>
        </p>
        <pre>
{`Channels:
  #help           stuck on a level? ask here
  #ghost          Ghost track discussion
  #phantom        Phantom track discussion
  #general        general talk
  #victories      share your wins
  #bugs           report platform issues
  #feedback       suggestions and ideas`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">SSH troubleshooting</h2>
        <p className="text-sm text-muted">
          The following commands may be useful:
        </p>
        <pre className="bg-bg border border-border p-3 text-xs">
{`# If SSH key changed warning appears
ssh-keygen -R "[play.breachlab.org]:2222"
ssh-keygen -R "[play.breachlab.org]:2223"

# If connection is refused, check port number
# Ghost: port 2222
# Phantom: port 2223`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Support the project</h2>
        <p className="text-sm text-muted">
          BreachLab is free. If you find it valuable, consider{" "}
          <Link href="/donate" className="text-amber hover:underline">
            donating
          </Link>{" "}
          to keep the servers running and new tracks coming.
        </p>
      </section>
    </div>
  );
}
