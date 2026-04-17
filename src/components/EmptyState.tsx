export function EmptyState({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div className="text-muted text-sm font-mono py-6 px-2">
      <span className="text-amber/60">// </span>
      <span>{message}</span>
      {hint ? (
        <>
          {" "}
          <span className="text-muted/70">· {hint}</span>
        </>
      ) : null}
    </div>
  );
}
