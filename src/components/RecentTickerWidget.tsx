const PLACEHOLDER = [{ id: "p1", text: "awaiting first operative" }];

export function RecentTickerWidget() {
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Recent</h2>
      <ul className="text-xs space-y-1">
        {PLACEHOLDER.map((e) => (
          <li key={e.id} data-testid="recent-event" className="text-muted">
            {e.text}
          </li>
        ))}
      </ul>
    </section>
  );
}
