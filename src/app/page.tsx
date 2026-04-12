export default function HomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-amber text-xl">BreachLab</h1>
      <p className="text-text">
        A wargame series for learning real-world security. No hand-holding,
        no GUIs, no CTF theatre. Just a terminal and a goal.
      </p>
      <section>
        <h2 className="text-lg mb-2">Suggested order</h2>
        <ol className="list-decimal list-inside text-sm space-y-1">
          <li>Ghost — Linux and shell fundamentals</li>
          <li>Phantom — privilege escalation and container escape (soon)</li>
        </ol>
      </section>
      <section>
        <h2 className="text-lg mb-2">Get started</h2>
        <pre className="bg-border/40 p-3 text-sm">
          ssh ghost0@ghost.breachlab.io -p 2222
        </pre>
      </section>
    </div>
  );
}
