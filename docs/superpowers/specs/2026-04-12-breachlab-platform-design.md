# BreachLab Platform — Design Spec

**Date:** 2026-04-12
**Status:** Approved for implementation planning
**Owner:** Boss
**Repository:** `breachlab-platform` (new, separate from `breachlab-ghost`)

---

## 1. Goal & Scope

Build `breachlab.io` — the public platform serving the BreachLab wargame series. The platform launches alongside the next major BreachLab publication and must deliver everything that distinguishes BreachLab from OverTheWire and other learning platforms while preserving the terminal-first culture ("ssh and play").

**Success criteria:** A new player can register, play Ghost, submit flags, appear on the leaderboard, link a Discord account, and donate via crypto — all on one site, with the BreachLab visual identity, on launch day.

**In scope (MVP v1):** Auth, Ghost integration, leaderboards (global + speedrun), first blood system, public profiles, Discord OAuth, BTCPay donations, full sidebar UI, anti-cheat for speedrun, TOTP 2FA, recent ops live feed.

**Out of scope (separate specs):**
- Ghost 2.0 content (new levels 10–12, level reworks)
- Phantom track (privesc / container escape) content
- Specter / Cipher / Mirage / Nexus / Oracle tracks

The platform supports those tracks via the `tracks` and `levels` tables, but creating their content is independent work.

---

## 2. High-Level Architecture

```
                    ┌────────────────────────────┐
                    │      Cloudflare DNS         │
                    │  breachlab.io + subdomains  │
                    └──────────────┬──────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
  │ ghost.       │         │ breachlab.io │         │ pay.         │
  │ breachlab.io │         │              │         │ breachlab.io │
  │              │         │ Next.js 15   │         │              │
  │ Ghost SSH    │         │ (web + API)  │         │ BTCPay       │
  │ containers   │         │              │         │ Server       │
  │ (existing)   │         │              │         │              │
  └──────────────┘         └──────┬───────┘         └──────┬───────┘
                                  │                        │
                                  ▼                        │
                          ┌──────────────┐                 │
                          │  Postgres 16 │◄────webhook─────┘
                          │  (Docker)    │
                          └──────────────┘

All services run on one VPS: 204.168.229.209
Fronted by Caddy (auto HTTPS via Let's Encrypt)
```

**Why Caddy over Nginx:** automatic HTTPS for all subdomains in two lines of config; we manage many subdomains and don't want manual cert orchestration.

---

## 3. Subdomains & DNS

| Subdomain | Purpose | Notes |
|---|---|---|
| `breachlab.io` | Main site (Next.js, web + API) | landing, tracks, rules, donate, dashboard, /api/* |
| `ghost.breachlab.io` | SSH entry for Ghost track | A-record → 204.168.229.209, port 2222 |
| `pay.breachlab.io` | BTCPay Server admin/checkout UI | separate Docker stack |

For MVP, `app` and `api` are paths inside `breachlab.io` (`/app`, `/api`), not subdomains. Single TLS cert, single deploy. Split later only if necessary.

**DNS provider:** Namecheap (where the domain is registered). DNS records configured manually in Namecheap Advanced DNS.

**Action items before launch:**
- Renew `breachlab.io` (currently expires 2026-04-24 — 12 days from spec date)
- Add A records for root + `ghost` + `pay`

---

## 4. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 15 (App Router) | SSR + API routes + Server Actions in one repo |
| Language | TypeScript | strict mode |
| Database | Postgres 16 (Docker) | relational, mature, runs on the VPS |
| ORM | Drizzle | thin SQL layer, less magic than Prisma |
| Auth | Lucia Auth | session-based, no Next-Auth bloat |
| 2FA | TOTP via `otpauth` lib | standard authenticator apps |
| Styling | Tailwind CSS v4 | with custom BreachLab palette |
| Fonts | JetBrains Mono (primary), IBM Plex Mono (fallback) | terminal aesthetic |
| Realtime | Server-Sent Events (SSE) via Next.js streaming | simpler than WebSocket, works behind Caddy |
| Rate limiting | `@upstash/ratelimit` (Redis) | for `/api/submit`, `/api/login`, `/api/register` |
| Payments | BTCPay Server (self-hosted Docker) | 0% fees, full crypto control |
| Discord OAuth | Discord OAuth2 + bot for role sync | links profiles + assigns server roles |
| Reverse proxy | Caddy | auto HTTPS |
| Deployment | `docker-compose.yml` on the existing VPS | colocates with Ghost containers |
| Monitoring | Uptime Kuma (self-hosted) | per-service uptime + alerts |
| Email | Resend or self-hosted SMTP | verification, password reset |

---

## 5. Data Model

```
users
  id (uuid), username (unique, citext), email (unique, citext),
  password_hash (argon2id), email_verified (bool), created_at,
  totp_secret (nullable), is_supporter (bool),
  discord_id (nullable, unique), discord_username (nullable),
  bio (text, nullable)

sessions                  -- Lucia
  id, user_id, expires_at

email_verifications       -- short-lived tokens
  id, user_id, token_hash, expires_at

password_resets
  id, user_id, token_hash, expires_at

tracks
  id, slug ("ghost"), name, status ("live"|"soon"|"planned"),
  order_idx, description_md

levels
  id, track_id, idx, title, description_md,
  points_base, points_first_blood_bonus,
  min_speedrun_seconds      -- anti-cheat threshold

flags
  id, level_id, flag_hash (sha256), created_at

submissions
  id, user_id, level_id, submitted_at, is_first_blood,
  points_awarded, source_ip, ssh_session_verified (bool)

ssh_sessions             -- synced from sshd logs of Ghost containers
  id, ghost_user, source_ip, started_at, ended_at, commands_count

speedrun_runs
  id, user_id, track_id, started_at, finished_at, total_seconds,
  is_suspicious (bool), review_status ("pending"|"approved"|"rejected"),
  reviewed_by, reviewed_at

badges
  id, user_id, kind ("first_blood"|"track_complete"|"supporter"|"speedrun_top10"),
  ref_id (level_id or track_id), awarded_at

donations
  id, user_id (nullable), btcpay_invoice_id (unique),
  amount_usd, currency, tx_hash, status, created_at

audit_log               -- admin actions, suspicious events
  id, actor_id, action, target_type, target_id, metadata, created_at
```

All passwords hashed with argon2id. All flag values stored as sha256 hash; plaintext flags exist only in the level filesystem on the Ghost container.

---

## 6. Key Flows

### 6.1 Registration
1. `/register` → form: username, email, password, optional TOTP setup
2. Email verification token sent (Resend)
3. On click → `email_verified = true`, auto-login, redirect to `/dashboard`
4. Username and email both unique, case-insensitive (citext)

### 6.2 Login
1. `/login` → email + password
2. If TOTP enabled, prompt for code
3. Lucia session created (httpOnly, secure cookie, 30-day expiry)

### 6.3 Playing Ghost (hybrid anonymous/auth)
1. Player runs `ssh ghost0@ghost.breachlab.io -p 2222` (unchanged from current)
2. Plays levels, finds flag of form `FLAG{ghost_l0_<random>}` and the SSH password for the next level (pwd ≠ flag — they exist side by side)
3. Optional: logs in at `breachlab.io/submit`, pastes flag
4. Server hashes input, matches against `flags.flag_hash`, records `submission`, awards points
5. First submission of player on a track → speedrun timer starts (`speedrun_runs.started_at`)
6. Final-level submission → `speedrun_runs.finished_at` set, anti-cheat evaluated
7. First-ever submission for a level → `is_first_blood = true`, badge awarded, bonus points

Anonymous players play freely without steps 3–7. They see the leaderboard but are not in it.

### 6.4 Donations
1. `/donate` → form: amount preset ($5 / $20 / $50 / Custom), "anonymous or use my account" toggle
2. POST → `/api/donate/create-invoice` → BTCPay API creates invoice, returns checkout URL
3. Redirect to `pay.breachlab.io` checkout (player picks BTC / ETH / USDT / USDC / XMR / BTC-Lightning)
4. Payment confirmed → BTCPay sends signed webhook to `/api/btcpay/webhook`
5. Endpoint verifies HMAC signature → writes `donations` row → if linked to user, sets `is_supporter = true` and awards "supporter" badge
6. Discord bot syncs "Supporter" role to the linked Discord account
7. Thank-you redirect

### 6.5 Discord OAuth + role sync
1. From dashboard: "Link Discord" → standard OAuth2 flow
2. We store `discord_id` on the user
3. A small Discord bot (Node, in the same repo, separate process) listens for role-sync events:
   - `is_supporter` → "Supporter" role
   - First blood → "First Blood" role
   - Track complete → "Ghost Master" role (and equivalents per track)
4. Sync runs on event + nightly reconciliation

### 6.6 Anti-cheat for speedrun
- `submissions.ssh_session_verified = true` if there is an `ssh_sessions` row with the same source IP within the last N minutes
- `speedrun_runs.is_suspicious = true` if **any** of:
  - `total_seconds < SUM(levels.min_speedrun_seconds)` for the track
  - Any submission in the run has `ssh_session_verified = false`
  - Two submissions less than X seconds apart (configurable per track)
- Top 10 speedrun runs require manual `review_status = "approved"` before being shown publicly. Suspicious runs are visible to admins only and surfaced in a review queue.

---

## 7. UI / Visual Design

**Layout (every page):** OverTheWire-style — sticky left sidebar + main content area. No marketing hero blocks. Information-dense, terminal-first.

**Sidebar (top → bottom):**
1. BreachLab logo (ASCII art)
2. **`[ DONATE ]`** button — amber, prominent, top-right corner of sidebar (mirrors OTW's `Donate!` placement)
3. **TRACKS** — list with status pills (`LIVE` / `SOON` / `···`)
4. **LIVE OPS** — online count, total operatives, completions today
5. **TOP 5** — top 5 by global points → link to full leaderboard
6. **RECENT** — live ticker via SSE (last 5 completions, animates on new event)
7. **LINKS** — Rules, Discord invite, GitHub, FAQ

**Main content pages:**
- `/` — short intro, suggested order, tracks table, "ssh to start" copy-button
- `/tracks/ghost` — track description, level table, what each level teaches, SSH command
- `/leaderboard` — tabs: Global / Speedrun / First Bloods
- `/rules` — no spoilers, no cheating, no automation against the levels
- `/donate` — preset amounts + custom, supported coins, BTCPay flow trigger
- `/login`, `/register`, `/forgot-password`, `/verify-email`
- `/dashboard` — your tracks, your submissions, your stats, your badges, link Discord, enable 2FA
- `/submit` — flag input, recent submissions, current points
- `/u/:username` — public profile: ASCII avatar derived from username, bio, solved tracks, badges, speedrun records, total points, joined date
- `/admin` — review queue, suspicious runs, audit log (admin-only, 2FA-required)

**Color palette:**
- Background: `#0a0a0a`
- Text: `#c0c0c0`
- Amber (links / CTA / accents): `#f59e0b`
- Green (success / online): `#10b981`
- Red (danger / suspicious): `#ef4444`
- Muted: `#6b7280`

**Typography:** JetBrains Mono throughout. Sizes 14 / 16 / 20 / 28 px.

**Effects:** ASCII separators, subtle glitch on link hover, blinking cursor in terminal blocks, no motion-heavy animation. The ticker animates new events with a one-line slide-in.

Frontend implementation will invoke the `frontend-design` skill during the implementation phase.

---

## 8. Security & Hardening

- Passwords: argon2id (Lucia default)
- Sessions: httpOnly, secure, sameSite=lax, 30-day expiry, server-side store
- TOTP: stored secret encrypted at rest with a server key; backup codes generated at setup
- BTCPay webhook: HMAC signature verification (BTCPay-Sig header)
- Discord bot token: stored in env, rotated if leaked
- Rate limits: `/api/submit` (per user, per IP), `/api/login`, `/api/register`, `/api/donate/create-invoice`
- Flag storage: sha256 only, plaintext in level filesystems only
- CSP, HSTS, X-Frame-Options, Referrer-Policy via Caddy
- Postgres: bound to docker network, never exposed
- BTCPay: separate subdomain, separate secrets, runs as its own user
- Admin panel: TOTP 2FA required (cannot be disabled for admins)
- Audit log for admin actions and suspicious events

---

## 9. Phasing

**MVP v1 (everything in this spec, ships at launch):**
- Auth (register / login / dashboard / email verify / password reset / TOTP 2FA)
- Ghost track integrated, flag submission
- Global leaderboard + Top 5 sidebar widget
- Speedrun leaderboard + anti-cheat + admin review queue
- First blood system (badges, bonus points, banner)
- Public profiles `/u/:username`
- Discord OAuth + role sync bot
- BTCPay donations (BTC, ETH, USDT, USDC, XMR, BTC-Lightning)
- Recent ops live ticker (SSE)
- Sidebar layout, full pages list
- Caddy + Postgres + BTCPay + web in one docker-compose
- Uptime Kuma for monitoring

**Out of v1 (separate specs):**
- Ghost 2.0 content additions (new levels, reworks)
- Phantom track content
- Future track content

---

## 10. Open Items Before Implementation Plan

- DNS configured at Namecheap (manual, before deploy)
- Domain renewed before 2026-04-24
- Wallet xpub for BTCPay receive addresses (Boss must generate)
- SMTP / Resend account for transactional email
- Discord application created, OAuth client + bot token obtained
- Decide admin user(s) bootstrap method (env-seeded admin email)

---

## 11. Future-Proofing Notes

- `tracks` and `levels` tables already support arbitrary new tracks — Phantom slots in with zero schema changes
- `badges.kind` is a string column to allow new badge types without migrations
- Speedrun anti-cheat thresholds are per-level and per-track, configurable in DB without redeploy
- `donations.user_id` nullable so anonymous donations remain supported even after we encourage account-linked ones
