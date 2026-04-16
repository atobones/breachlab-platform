import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-amber text-2xl">Help</h1>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">How to play</h2>
        <p className="text-sm">
          BreachLab is a wargame. Each track is a set of levels on real
          vulnerable infrastructure. You connect via SSH, find the flag, and
          submit it on this site. The flag for each level is the password for
          the next level.
        </p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>
            <Link href="/register" className="text-amber hover:underline">
              Register
            </Link>{" "}
            an account on this site
          </li>
          <li>Pick a track and connect via SSH (connection info on each track page)</li>
          <li>Read the README in your home directory</li>
          <li>Find the flag</li>
          <li>
            <Link href="/submit" className="text-amber hover:underline">
              Submit the flag
            </Link>{" "}
            to earn points
          </li>
          <li>Use the flag as the password for the next level</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Community</h2>
        <div className="space-y-2 text-sm">
          <p>
            <a
              href="https://discord.gg/hJrteuV6"
              className="text-amber hover:underline"
              rel="noreferrer"
            >
              Discord
            </a>{" "}
            — ask questions, discuss levels, share progress
          </p>
          <p>
            <a
              href="https://github.com/atobones/breachlab-platform"
              className="text-amber hover:underline"
              rel="noreferrer"
            >
              GitHub
            </a>{" "}
            — report bugs, request features
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Useful commands</h2>
        <pre className="bg-bg border border-border p-3 text-xs">
{`# If SSH key changed warning appears
ssh-keygen -R "[204.168.229.209]:2222"
ssh-keygen -R "[204.168.229.209]:2223"

# If you don't know how to use a command
man <command>
help <command>`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Support the project</h2>
        <p className="text-sm text-muted">
          BreachLab is free and open source. If you find it valuable,
          consider{" "}
          <Link href="/donate" className="text-amber hover:underline">
            donating
          </Link>{" "}
          to keep the servers running and new tracks coming.
        </p>
      </section>
    </div>
  );
}
