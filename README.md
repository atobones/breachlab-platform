# BreachLab

**Offensive-security wargame platform.** 13 tracks, 320+ planned levels, no hand-holding.

[**Play now →**](https://breachlab.org)  ·  [About](#about)  ·  [Tracks](#tracks)  ·  [Self-host](#self-host)  ·  [Contribute](#contribute)  ·  [Security](SECURITY.md)

> *Real skills. Real scenarios. No CTF bullshit.*

This repository is the **web platform** behind `breachlab.org` — accounts, flag submission, leaderboards, track progression, certificates, donations. The wargame challenges themselves (Ghost, Phantom, etc.) live in separate private repos because open-sourcing them would trivially leak every flag.

---

## About

BreachLab is being built for the security landscape that actually exists in 2026 — containers, Kubernetes, cloud metadata services, supply-chain attacks, AI/LLM exploitation, APT-grade red-team tradecraft — not the 2010s curriculum you'll find on most free wargame sites.

Two tracks are already playable and being used by real hiring teams for pre-interview skill checks:

- **Ghost** — Linux + shell foundation. 23 levels from `ls` to multi-technique graduation.
- **Phantom** — Post-exploitation. 32 levels across five acts: escalation, harvest & persist, lateral movement, container & cloud escape, full operations.

11 more tracks are on the roadmap — web, AD, darknet OPSEC, AI/LLM security, binary exploitation, red team, and others that no existing wargame platform covers in depth.

The principle: if real pentesters and red teamers don't use the technique, it doesn't ship.

## Tracks

| # | Track | Focus | Levels | Status |
|---|-------|-------|--------|--------|
| 1 | **Ghost** | Linux & shell foundation | 23 | LIVE |
| 2 | **Phantom** | Post-exploitation (privesc → persist → lateral → container → cloud → ops) | 32 | LIVE |
| 3 | Specter | Network, WiFi, phishing, DDoS, firewall evasion | ~30 | Coming soon |
| 4 | Mirage | Web application exploitation | ~28 | Planned |
| 5 | Cipher | Crypto & password attacks | ~20 | Planned |
| 6 | Nexus | CI/CD + supply-chain | ~22 | Planned |
| 7 | Oracle | AI / LLM security | ~18 | Planned |
| 8 | Wraith | Windows & Active Directory | ~30 | Planned |
| 9 | Shadow | Anonymity, OPSEC, darknet, counter-forensics | ~25 | Planned |
| 10 | Sentinel | Blue team, forensics, IR, detection engineering | ~25 | Planned |
| 11 | Prism | Apple security — macOS + iOS | ~22 | Planned |
| 12 | Venom | Red Team operations — C2, implants, campaigns | ~25 | Planned |
| 13 | Flux | Binary exploitation, reverse engineering, malware RE | ~25 | Planned |

## How it feels to play

```bash
ssh ghost0@204.168.229.209 -p 2222
# password: ghost0
```

No signup, no browser, no hand-holding. Every level is a different unprivileged user — find the password to the next one. Each login shows the current brief plus canonical topic links (man pages, primary-source docs) — if you're stuck, you read. The platform records your progression and issues certificates on graduation.

Phantom picks up where Ghost ends:

```bash
ssh phantom0@204.168.229.209 -p 2223
# password: phantom0
```

## Tech stack

- **Next.js 15** (App Router), **React 19**, **Tailwind v4**
- **Lucia** sessions, TOTP 2FA, email verification, rate limiting on auth
- **Drizzle ORM** on **PostgreSQL 16**, Drizzle Kit migrations
- **Vitest** unit tests, **Playwright** end-to-end
- **Docker Compose** (app + Postgres + Caddy) on a single VPS
- Deployed on Hetzner CPX32, Caddy terminating TLS via Let's Encrypt

## Self-host

Clone, fill in `.env`, and go.

```bash
git clone https://github.com/atobones/breachlab-platform.git
cd breachlab-platform
cp .env.example .env
npm install
npm run dev
# → http://localhost:3000
```

Test suites:

```bash
npm test            # unit (Vitest)
npm run test:e2e    # end-to-end (Playwright)
```

Full production docker stack locally:

```bash
docker compose up -d --build
curl http://localhost/api/health
```

### Production deploy (single VPS)

1. Copy the repo to the VPS.
2. `cp .env.production.example .env` and fill in real values — especially `POSTGRES_PASSWORD` and any webhook/API secrets.
3. `cp Caddyfile.prod Caddyfile`
4. Point DNS A records for your apex + `www` at the VPS.
5. `docker compose up -d --build`
6. `curl https://your-domain/api/health`

Caddy handles Let's Encrypt automatically.

## Architecture

- `src/app/` — App Router routes + API handlers
- `src/components/` — React components (cards, certificates, track tables, admin)
- `src/lib/auth/` — Lucia adapter, TOTP, password hashing, rate limiter
- `src/lib/db/` — Drizzle schema + client + query helpers
- `src/lib/tracks/` — per-track content (briefs, level tables, tier definitions)
- `src/lib/submit.ts` — flag submission with server-side hashing
- `drizzle/` — migrations
- `tests/unit/` — Vitest specs
- `tests/e2e/` — Playwright specs
- `docs/superpowers/` — design specs + implementation plans for every feature

The wargame containers (Ghost, Phantom) run as sibling services on the same VPS and talk to this platform only through flag-hash submission — they never see user data.

## Security

See [SECURITY.md](SECURITY.md) for the disclosure policy. Summary:

- Real vulnerabilities in the platform → private report via GitHub Advisories, 48 h ack, safe-harbor for good-faith research.
- "Bugs" in the wargame challenges themselves are **by design** — that's what you're there to find.

## Contribute

The platform is open to PRs. Good first areas:

- Track progression UX (`src/components/tracks/`)
- Accessibility pass on the dashboard
- Additional unit coverage (`tests/unit/tracks/`)
- Internationalization scaffolding
- New certificate templates

Level design (Ghost / Phantom / future tracks) is curated and happens in the private challenge repos. If you're interested in contributing challenges, reach out first — per-challenge review is heavy and we want to keep the quality bar.

Plans and specs live under `docs/superpowers/` — read those before large changes.

## Roadmap

Short-term:
- Per-player ephemeral instances with randomized flags (unlocks open-sourcing the challenge containers)
- Detection Score — "did you get caught?" — after every level
- MITRE ATT&CK mapping on each level
- Speedrun leaderboards + replays

Medium-term:
- Next tracks: Specter, Wraith, Mirage
- Team-vs-team purple modes
- Career-path dashboard linking tracks to real job roles

## License

No license file is in the repo yet — the platform is **source-available** but not yet under an OSS license. Usage of the code beyond local evaluation requires permission. A proper license (likely AGPL) will land before the first contribution PR is merged.

## Links

- **Live platform** → https://breachlab.org
- **Play Ghost** → `ssh ghost0@204.168.229.209 -p 2222` (password: `ghost0`)
- **Play Phantom** → `ssh phantom0@204.168.229.209 -p 2223` (password: `phantom0`)
- **Security reports** → [SECURITY.md](SECURITY.md)
