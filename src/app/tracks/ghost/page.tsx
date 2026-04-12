export default function GhostTrackPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Ghost</h1>
      <p>Linux and shell fundamentals. The first BreachLab track.</p>
      <pre className="bg-border/40 p-3 text-sm">
        ssh ghost0@ghost.breachlab.io -p 2222
      </pre>
      <p className="text-muted text-sm">
        Level details and submission flow arrive in a later plan.
      </p>
    </div>
  );
}
