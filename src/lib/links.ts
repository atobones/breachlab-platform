// Public-facing community / external link constants.
// Centralised so a single rotation (e.g. expired Discord invite) is a
// one-line edit instead of a 12-file grep+replace. Damiska_21 reported
// the previous invite expired 2026-04-28 — that was the trigger.
//
// If a URL needs to differ between environments, switch to a
// NEXT_PUBLIC_* env var and read it from process.env here. For now
// these are the same in dev and prod.

export const DISCORD_INVITE_URL = "https://discord.gg/Xa2H8jfJPr";
