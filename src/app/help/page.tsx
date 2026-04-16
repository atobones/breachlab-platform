export default function HelpPage() {
  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-amber text-2xl">Help</h1>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">How to play</h2>
        <p className="text-sm">
          BreachLab is a wargame. Each track is a set of levels. You connect
          via SSH, find the flag, and submit it on this site. The flag for
          each level is the password for the next level.
        </p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          <li>
            <a href="/register" className="text-amber hover:underline">
              Register
            </a>{" "}
            an account on this site
          </li>
          <li>Connect via SSH to the track you want to play</li>
          <li>Read the BRIEFING file in your home directory</li>
          <li>Find the flag by exploiting the vulnerability</li>
          <li>
            <a href="/submit" className="text-amber hover:underline">
              Submit the flag
            </a>{" "}
            on this site to earn points
          </li>
          <li>Use the flag as the password for the next level</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">SSH Access</h2>

        <div className="border border-border p-4 space-y-2">
          <h3 className="text-amber text-sm uppercase tracking-wider">
            Ghost — Linux Fundamentals
          </h3>
          <pre className="bg-bg border border-border p-2 text-xs">
            ssh ghost0@204.168.229.209 -p 2222
          </pre>
          <p className="text-xs text-muted">Password: ghost0</p>
        </div>

        <div className="border border-border p-4 space-y-2">
          <h3 className="text-red text-sm uppercase tracking-wider">
            Phantom — Post-Exploitation
          </h3>
          <pre className="bg-bg border border-border p-2 text-xs">
            ssh phantom0@204.168.229.209 -p 2223
          </pre>
          <p className="text-xs text-muted">Password: phantom0</p>
        </div>
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
            — ask questions, discuss levels, share progress. Do not spoil
            flags.
          </p>
          <p>
            <a
              href="https://github.com/atobones/breachlab-platform"
              className="text-amber hover:underline"
              rel="noreferrer"
            >
              GitHub
            </a>{" "}
            — report bugs, request features, contribute.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Rules</h2>
        <ul className="text-sm space-y-1 list-disc list-inside text-muted">
          <li>Do not share flags or solutions publicly</li>
          <li>Do not attack the platform infrastructure itself</li>
          <li>Do not interfere with other players</li>
          <li>Do not brute force the flag submission form</li>
          <li>
            Stuck? Use man pages, documentation, and search engines — not
            other players&apos; answers
          </li>
        </ul>
        <p className="text-xs text-muted">
          Full rules at{" "}
          <a href="/rules" className="text-amber hover:underline">
            /rules
          </a>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Useful commands</h2>
        <p className="text-xs text-muted mb-2">
          If you don&apos;t know how to use a command, try{" "}
          <code className="text-amber">man &lt;command&gt;</code> or{" "}
          <code className="text-amber">help &lt;command&gt;</code>.
        </p>
        <pre className="bg-bg border border-border p-3 text-xs space-y-1">
{`# Connect to Ghost level 0
ssh ghost0@204.168.229.209 -p 2222

# Connect to Phantom level 0
ssh phantom0@204.168.229.209 -p 2223

# If SSH key changed warning appears
ssh-keygen -R "[204.168.229.209]:2222"
ssh-keygen -R "[204.168.229.209]:2223"`}
        </pre>
      </section>

      <section className="space-y-3">
        <h2 className="text-amber text-lg">Support the project</h2>
        <p className="text-sm text-muted">
          BreachLab is free and open source. If you find it valuable,
          consider{" "}
          <a href="/donate" className="text-amber hover:underline">
            donating
          </a>{" "}
          to keep the servers running and new tracks coming.
        </p>
      </section>
    </div>
  );
}
