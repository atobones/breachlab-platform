# BreachLab Platform

The web platform behind `breachlab.io`. Foundation skeleton — auth, leaderboards, donations land in subsequent plans.

## Local development

```bash
npm install
cp .env.example .env
npm run dev
```

Then `http://localhost:3000`.

## Tests

```bash
npm test            # unit (Vitest)
npm run test:e2e    # smoke (Playwright)
```

## Local docker stack

```bash
docker compose up -d --build
curl http://localhost/api/health
```

## Production deploy (VPS)

1. Copy the repo to the VPS at `204.168.229.209`.
2. `cp .env.production.example .env` and fill in real values (set a strong `POSTGRES_PASSWORD`).
3. `cp Caddyfile.prod Caddyfile`
4. Make sure DNS A records for `breachlab.io` and `www.breachlab.io` point to the VPS.
5. `docker compose up -d --build`
6. `curl https://breachlab.io/api/health`

## Specs and plans

`docs/superpowers/specs/` and `docs/superpowers/plans/`.
