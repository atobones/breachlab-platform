// Public-facing community / external link constants.
// Centralised so a single rotation (e.g. expired Discord invite) is a
// one-line edit instead of a 12-file grep+replace.
//
// Current invite (rotated 2026-04-30) auto-assigns the Operative role on
// join — bypasses the no-role limbo state where Community-server features
// were silently removing pending members without writing an audit log
// entry. Replaces previous Xa2H8jfJPr invite.
//
// If a URL needs to differ between environments, switch to a
// NEXT_PUBLIC_* env var and read it from process.env here. For now
// these are the same in dev and prod.

export const DISCORD_INVITE_URL = "https://discord.gg/xqTbW6juXt";
