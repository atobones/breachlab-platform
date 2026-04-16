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
        <pre className="text-sm">
{`Channels:
        #wargames       (for talk related to the games)
        #general        (for general talk)`}
        </pre>
        <p className="text-sm text-muted">
          Please be aware of our{" "}
          <Link href="/rules" className="text-amber hover:underline">
            rules
          </Link>
          . When you first connect, you will be reminded of them.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">SSH troubleshooting</h2>
        <p className="text-sm text-muted">
          The following commands may be useful:
        </p>
        <pre className="bg-bg border border-border p-3 text-xs">
{`# If SSH key changed warning appears
ssh-keygen -R "[204.168.229.209]:2222"
ssh-keygen -R "[204.168.229.209]:2223"

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
