// Bottom slot of the Ops Wall — a docked frame for the interactive shell.
// When the user opens the shell (backtick key or the corner SHELL button),
// the existing <CommandPalette> overlay is restyled at the 3xl breakpoint
// to anchor inside this frame instead of dimming the whole viewport. See
// the `@media (min-width: 2200px) .palette-backdrop { ... }` block in
// globals.css for the positioning rules.

export function ShellSlot() {
  return (
    <div className="border border-amber/20 px-3 py-2 flex items-center justify-between text-[11px] shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-amber">[ INTERACTIVE SHELL ]</span>
        <span className="text-muted">
          press{" "}
          <kbd className="border border-amber/40 px-1 py-0.5 mx-0.5 text-amber tabular-nums">
            `
          </kbd>{" "}
          to open · type{" "}
          <code className="text-amber">help</code> for commands
        </span>
      </div>
      <span className="text-amber/40 tabular-nums">atobones@breachlab:~$</span>
    </div>
  );
}
