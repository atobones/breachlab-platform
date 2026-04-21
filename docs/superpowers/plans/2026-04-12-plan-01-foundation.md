# BreachLab Platform — Plan 01: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the empty BreachLab Platform skeleton — Next.js 15 + TypeScript + Tailwind v4 + Drizzle + Postgres, deployed via docker-compose behind Caddy on the existing VPS, with the BreachLab sidebar layout rendering on placeholder pages and HTTPS live on `breachlab.io`.

**Architecture:** Single Next.js 15 application using App Router, served by Node in a Docker container. Postgres 16 in a sibling container. Caddy as reverse proxy with automatic Let's Encrypt HTTPS. All three services in one `docker-compose.yml` on the existing VPS at `&lt;vps-ip&gt;`. The same VPS already hosts the Ghost SSH containers, which remain untouched. The skeleton renders the OverTheWire-style sidebar layout (left: navigation + Donate button + placeholders for Top 5 / Recent / Live Ops; right: page content) on every route, with stub pages for `/`, `/tracks/ghost`, `/leaderboard`, `/rules`, `/donate`, `/login`, `/register`.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), Tailwind CSS v4, Drizzle ORM, Postgres 16, Vitest + React Testing Library, Playwright (smoke E2E), Docker, docker-compose, Caddy, JetBrains Mono.

**Out of scope for this plan:** Auth, real database tables (only the infra connection), real leaderboard data, BTCPay, Discord, content for Ghost track, anti-cheat. Those are Plans 02–07.

---

## File Structure

After this plan, the repository looks like:

```
breachlab-platform/
├── docker-compose.yml
├── Caddyfile
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── vitest.config.ts
├── playwright.config.ts
├── drizzle.config.ts
├── Dockerfile
├── src/
│   ├── app/
│   │   ├── layout.tsx              -- root layout, fonts, globals
│   │   ├── globals.css             -- Tailwind v4 + BreachLab tokens
│   │   ├── page.tsx                -- "/"
│   │   ├── tracks/
│   │   │   └── ghost/
│   │   │       └── page.tsx        -- "/tracks/ghost"
│   │   ├── leaderboard/page.tsx
│   │   ├── rules/page.tsx
│   │   ├── donate/page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── api/
│   │       └── health/route.ts     -- healthcheck endpoint
│   ├── components/
│   │   ├── Sidebar.tsx             -- the OTW-style left sidebar
│   │   ├── DonateButton.tsx
│   │   ├── TracksNav.tsx
│   │   ├── LiveOpsWidget.tsx       -- placeholder values for now
│   │   ├── TopFiveWidget.tsx       -- placeholder values for now
│   │   ├── RecentTickerWidget.tsx  -- placeholder values for now
│   │   └── SidebarLinks.tsx
│   ├── lib/
│   │   └── db/
│   │       ├── client.ts           -- drizzle client factory
│   │       └── schema.ts           -- empty schema, just exports
│   └── styles/
│       └── tokens.css              -- color + spacing tokens
├── tests/
│   ├── unit/
│   │   ├── Sidebar.test.tsx
│   │   ├── DonateButton.test.tsx
│   │   └── health.test.ts
│   └── e2e/
│       └── smoke.spec.ts
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-04-12-breachlab-platform-design.md   (already exists)
        └── plans/
            └── 2026-04-12-plan-01-foundation.md          (this file)
```

---

## Task 1: Initialize the Next.js project

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Run the Next.js initializer**

Run from inside the repo root (`~/Desktop/breachlab-platform`):

```bash
cd ~/Desktop/breachlab-platform
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-eslint \
  --no-turbopack \
  --use-npm \
  --yes
```

Expected: command exits 0, files are created. The existing `docs/` folder must remain intact (the initializer skips non-empty subdirs other than its own).

- [ ] **Step 2: Pin Next.js to 15.x and verify Tailwind is v4**

Open `package.json` and confirm `next` is on `^15`. If the initializer pulled an older version, edit:

```json
"dependencies": {
  "next": "^15.0.0",
  "react": "^19.0.0",
  "react-dom": "^19.0.0"
}
```

Confirm `tailwindcss` in devDependencies is `^4`. If not, update to `^4.0.0`.

Then:

```bash
npm install
```

- [ ] **Step 3: Verify the dev server runs**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: default Next.js page renders. Stop the server (`Ctrl+C`).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(foundation): initialize Next.js 15 + TypeScript + Tailwind v4 project"
```

---

## Task 2: Add BreachLab design tokens and JetBrains Mono font

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/styles/tokens.css`

- [ ] **Step 1: Create the tokens file**

Create `src/styles/tokens.css`:

```css
:root {
  --bl-bg: #0a0a0a;
  --bl-text: #c0c0c0;
  --bl-amber: #f59e0b;
  --bl-green: #10b981;
  --bl-red: #ef4444;
  --bl-muted: #6b7280;
  --bl-border: #1f1f1f;

  --bl-font-mono: "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;

  --bl-text-sm: 14px;
  --bl-text-base: 16px;
  --bl-text-lg: 20px;
  --bl-text-xl: 28px;
}
```

- [ ] **Step 2: Replace `globals.css`**

Overwrite `src/app/globals.css`:

```css
@import "tailwindcss";
@import "../styles/tokens.css";

@theme {
  --color-bg: var(--bl-bg);
  --color-text: var(--bl-text);
  --color-amber: var(--bl-amber);
  --color-green: var(--bl-green);
  --color-red: var(--bl-red);
  --color-muted: var(--bl-muted);
  --color-border: var(--bl-border);
  --font-mono: var(--bl-font-mono);
}

html, body {
  background: var(--bl-bg);
  color: var(--bl-text);
  font-family: var(--bl-font-mono);
  font-size: var(--bl-text-base);
  -webkit-font-smoothing: antialiased;
}

a { color: var(--bl-amber); text-decoration: none; }
a:hover { text-decoration: underline; }
```

- [ ] **Step 3: Wire JetBrains Mono via `next/font`**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BreachLab",
  description: "Real skills. Real scenarios. No CTF bullshit.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Replace the default home page with a skeleton**

Overwrite `src/app/page.tsx`:

```tsx
export default function HomePage() {
  return (
    <main>
      <h1 className="text-amber text-xl">BreachLab</h1>
      <p>Real skills. Real scenarios. No CTF bullshit.</p>
    </main>
  );
}
```

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: black background, monospace text, amber `BreachLab` headline. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(foundation): add BreachLab design tokens and JetBrains Mono font"
```

---

## Task 3: Install testing infrastructure (Vitest + RTL + Playwright)

**Files:**
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/unit/.gitkeep`
- Create: `tests/e2e/.gitkeep`
- Modify: `package.json` (scripts + devDependencies)

- [ ] **Step 1: Install dev dependencies**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @playwright/test
npx playwright install --with-deps chromium
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
});
```

- [ ] **Step 3: Create the test setup file**

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 4: Create `playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
```

- [ ] **Step 5: Add scripts to `package.json`**

In the `scripts` block, add:

```json
"test": "vitest run",
"test:watch": "vitest",
"test:e2e": "playwright test"
```

- [ ] **Step 6: Verify tests run (zero tests = pass)**

```bash
npm test
```

Expected: Vitest reports `No test files found, exiting with code 0` or similar non-error completion.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "test(foundation): install Vitest + RTL + Playwright"
```

---

## Task 4: Healthcheck endpoint with a unit test (TDD)

**Files:**
- Create: `tests/unit/health.test.ts`
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/health.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 with status ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

Expected: FAIL — module `@/app/api/health/route` does not exist.

- [ ] **Step 3: Implement the route**

Create `src/app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok" }, { status: 200 });
}
```

- [ ] **Step 4: Run and verify pass**

```bash
npm test
```

Expected: 1 test passes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(foundation): add /api/health endpoint with test"
```

---

## Task 5: DonateButton component (TDD)

**Files:**
- Create: `tests/unit/DonateButton.test.tsx`
- Create: `src/components/DonateButton.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/DonateButton.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DonateButton } from "@/components/DonateButton";

describe("DonateButton", () => {
  it("renders the DONATE label", () => {
    render(<DonateButton />);
    expect(screen.getByRole("link", { name: /donate/i })).toBeInTheDocument();
  });

  it("links to /donate", () => {
    render(<DonateButton />);
    const link = screen.getByRole("link", { name: /donate/i });
    expect(link).toHaveAttribute("href", "/donate");
  });

  it("uses amber accent class", () => {
    render(<DonateButton />);
    const link = screen.getByRole("link", { name: /donate/i });
    expect(link.className).toMatch(/amber/);
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

Expected: FAIL — `@/components/DonateButton` does not exist.

- [ ] **Step 3: Implement**

Create `src/components/DonateButton.tsx`:

```tsx
import Link from "next/link";

export function DonateButton() {
  return (
    <Link
      href="/donate"
      className="inline-block border border-amber text-amber px-3 py-1 hover:bg-amber hover:text-bg transition-colors uppercase tracking-wider text-sm"
    >
      [ Donate ]
    </Link>
  );
}
```

- [ ] **Step 4: Run and verify pass**

```bash
npm test
```

Expected: 4 tests pass total (health + 3 DonateButton).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(foundation): add DonateButton component"
```

---

## Task 6: Sidebar widget placeholders (TracksNav, LiveOpsWidget, TopFiveWidget, RecentTickerWidget, SidebarLinks)

**Files:**
- Create: `src/components/TracksNav.tsx`
- Create: `src/components/LiveOpsWidget.tsx`
- Create: `src/components/TopFiveWidget.tsx`
- Create: `src/components/RecentTickerWidget.tsx`
- Create: `src/components/SidebarLinks.tsx`
- Create: `tests/unit/sidebar-widgets.test.tsx`

These widgets render hardcoded placeholder data in this plan. Real data is wired in Plans 02–05.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/sidebar-widgets.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TracksNav } from "@/components/TracksNav";
import { LiveOpsWidget } from "@/components/LiveOpsWidget";
import { TopFiveWidget } from "@/components/TopFiveWidget";
import { RecentTickerWidget } from "@/components/RecentTickerWidget";
import { SidebarLinks } from "@/components/SidebarLinks";

describe("TracksNav", () => {
  it("lists Ghost as LIVE and at least Phantom as SOON", () => {
    render(<TracksNav />);
    expect(screen.getByText("Ghost")).toBeInTheDocument();
    expect(screen.getByText("LIVE")).toBeInTheDocument();
    expect(screen.getByText("Phantom")).toBeInTheDocument();
    expect(screen.getAllByText("SOON").length).toBeGreaterThan(0);
  });

  it("links Ghost to /tracks/ghost", () => {
    render(<TracksNav />);
    const ghostLink = screen.getByRole("link", { name: /ghost/i });
    expect(ghostLink).toHaveAttribute("href", "/tracks/ghost");
  });
});

describe("LiveOpsWidget", () => {
  it("renders an online count", () => {
    render(<LiveOpsWidget />);
    expect(screen.getByText(/online now/i)).toBeInTheDocument();
  });
});

describe("TopFiveWidget", () => {
  it("renders five rows", () => {
    render(<TopFiveWidget />);
    const rows = screen.getAllByTestId("top-five-row");
    expect(rows.length).toBe(5);
  });

  it("links to /leaderboard", () => {
    render(<TopFiveWidget />);
    expect(screen.getByRole("link", { name: /full board/i })).toHaveAttribute(
      "href",
      "/leaderboard"
    );
  });
});

describe("RecentTickerWidget", () => {
  it("renders at least one recent event", () => {
    render(<RecentTickerWidget />);
    expect(screen.getAllByTestId("recent-event").length).toBeGreaterThan(0);
  });
});

describe("SidebarLinks", () => {
  it("includes Rules, Discord, GitHub", () => {
    render(<SidebarLinks />);
    expect(screen.getByRole("link", { name: /rules/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /discord/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

Expected: 5 failing test files (modules not found).

- [ ] **Step 3: Implement TracksNav**

Create `src/components/TracksNav.tsx`:

```tsx
import Link from "next/link";

type TrackStatus = "LIVE" | "SOON" | "PLANNED";
type Track = { slug: string; name: string; status: TrackStatus };

const TRACKS: Track[] = [
  { slug: "ghost", name: "Ghost", status: "LIVE" },
  { slug: "phantom", name: "Phantom", status: "SOON" },
  { slug: "specter", name: "Specter", status: "SOON" },
  { slug: "cipher", name: "Cipher", status: "PLANNED" },
  { slug: "mirage", name: "Mirage", status: "PLANNED" },
  { slug: "nexus", name: "Nexus", status: "PLANNED" },
  { slug: "oracle", name: "Oracle", status: "PLANNED" },
];

const STATUS_COLOR: Record<TrackStatus, string> = {
  LIVE: "text-green",
  SOON: "text-amber",
  PLANNED: "text-muted",
};

export function TracksNav() {
  return (
    <nav aria-label="Tracks">
      <h2 className="text-muted text-sm uppercase mb-2">▸ Tracks</h2>
      <ul className="space-y-1 text-sm">
        {TRACKS.map((t) => (
          <li key={t.slug} className="flex justify-between">
            <Link href={`/tracks/${t.slug}`}>{t.name}</Link>
            <span className={STATUS_COLOR[t.status]}>{t.status}</span>
          </li>
        ))}
      </ul>
    </nav>
  );
}
```

- [ ] **Step 4: Implement LiveOpsWidget**

Create `src/components/LiveOpsWidget.tsx`:

```tsx
export function LiveOpsWidget() {
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Live Ops</h2>
      <ul className="text-sm space-y-1">
        <li>
          <span className="text-green">●</span> 0 online now
        </li>
        <li>0 operatives</li>
        <li>0 completions today</li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 5: Implement TopFiveWidget**

Create `src/components/TopFiveWidget.tsx`:

```tsx
import Link from "next/link";

const PLACEHOLDER = [
  { rank: 1, name: "—", points: 0 },
  { rank: 2, name: "—", points: 0 },
  { rank: 3, name: "—", points: 0 },
  { rank: 4, name: "—", points: 0 },
  { rank: 5, name: "—", points: 0 },
];

export function TopFiveWidget() {
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Top 5</h2>
      <ul className="text-sm space-y-1">
        {PLACEHOLDER.map((row) => (
          <li
            key={row.rank}
            data-testid="top-five-row"
            className="flex justify-between"
          >
            <span>
              {row.rank}. {row.name}
            </span>
            <span className="text-muted">{row.points}</span>
          </li>
        ))}
      </ul>
      <Link href="/leaderboard" className="text-xs">
        [full board →]
      </Link>
    </section>
  );
}
```

- [ ] **Step 6: Implement RecentTickerWidget**

Create `src/components/RecentTickerWidget.tsx`:

```tsx
const PLACEHOLDER = [
  { id: "p1", text: "awaiting first operative" },
];

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
```

- [ ] **Step 7: Implement SidebarLinks**

Create `src/components/SidebarLinks.tsx`:

```tsx
import Link from "next/link";

export function SidebarLinks() {
  return (
    <section>
      <h2 className="text-muted text-sm uppercase mb-2">▸ Links</h2>
      <ul className="text-sm space-y-1">
        <li>
          <Link href="/rules">Rules</Link>
        </li>
        <li>
          <a href="https://discord.gg/breachlab" rel="noreferrer">
            Discord
          </a>
        </li>
        <li>
          <a
            href="https://github.com/atobones/breachlab-platform"
            rel="noreferrer"
          >
            GitHub
          </a>
        </li>
      </ul>
    </section>
  );
}
```

- [ ] **Step 8: Run and verify pass**

```bash
npm test
```

Expected: all sidebar widget tests pass plus prior tests (10+ total).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(foundation): add sidebar widget placeholders"
```

---

## Task 7: Sidebar composition (TDD)

**Files:**
- Create: `tests/unit/Sidebar.test.tsx`
- Create: `src/components/Sidebar.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/Sidebar.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/Sidebar";

describe("Sidebar", () => {
  it("renders the BreachLab logo text", () => {
    render(<Sidebar />);
    expect(screen.getByText(/BreachLab/i)).toBeInTheDocument();
  });

  it("renders the Donate button at the top, before tracks", () => {
    render(<Sidebar />);
    const html = document.body.innerHTML;
    const donateIdx = html.indexOf("Donate");
    const tracksIdx = html.indexOf("Tracks");
    expect(donateIdx).toBeGreaterThan(-1);
    expect(tracksIdx).toBeGreaterThan(-1);
    expect(donateIdx).toBeLessThan(tracksIdx);
  });

  it("contains TracksNav, LiveOps, TopFive, Recent, Links", () => {
    render(<Sidebar />);
    expect(screen.getByText(/Tracks/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Ops/i)).toBeInTheDocument();
    expect(screen.getByText(/Top 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent/i)).toBeInTheDocument();
    expect(screen.getByText(/Links/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run and verify failure**

```bash
npm test
```

Expected: 3 failing tests in `Sidebar.test.tsx`.

- [ ] **Step 3: Implement the Sidebar**

Create `src/components/Sidebar.tsx`:

```tsx
import { DonateButton } from "./DonateButton";
import { TracksNav } from "./TracksNav";
import { LiveOpsWidget } from "./LiveOpsWidget";
import { TopFiveWidget } from "./TopFiveWidget";
import { RecentTickerWidget } from "./RecentTickerWidget";
import { SidebarLinks } from "./SidebarLinks";

export function Sidebar() {
  return (
    <aside className="w-64 shrink-0 border-r border-border p-4 sticky top-0 h-screen overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <span className="text-amber text-lg font-bold">BreachLab</span>
        <DonateButton />
      </div>
      <div className="space-y-6">
        <TracksNav />
        <LiveOpsWidget />
        <TopFiveWidget />
        <RecentTickerWidget />
        <SidebarLinks />
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run and verify pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(foundation): compose Sidebar from widgets"
```

---

## Task 8: Wire Sidebar into the root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Update the layout to include the sidebar on every page**

Replace `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BreachLab",
  description: "Real skills. Real scenarios. No CTF bullshit.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 p-8 max-w-4xl">{children}</main>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify visually**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: sidebar on the left with `BreachLab` + `[ Donate ]` at top, tracks list below, then placeholder widgets, then links. Main content shows the home page text. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(foundation): wire Sidebar into root layout"
```

---

## Task 9: Stub pages for all v1 routes

**Files:**
- Modify: `src/app/page.tsx`
- Create: `src/app/tracks/ghost/page.tsx`
- Create: `src/app/leaderboard/page.tsx`
- Create: `src/app/rules/page.tsx`
- Create: `src/app/donate/page.tsx`
- Create: `src/app/login/page.tsx`
- Create: `src/app/register/page.tsx`

Each page is a static React Server Component for now. Real content arrives in later plans.

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/app/tracks/ghost/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Create `src/app/leaderboard/page.tsx`**

```tsx
export default function LeaderboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Leaderboard</h1>
      <p className="text-muted">Coming online with Plan 03.</p>
    </div>
  );
}
```

- [ ] **Step 4: Create `src/app/rules/page.tsx`**

```tsx
export default function RulesPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Rules</h1>
      <ol className="list-decimal list-inside space-y-2 text-sm">
        <li>Do not publish flags, walkthroughs, or solutions.</li>
        <li>Do not automate brute force against levels or submission.</li>
        <li>Treat other operatives with respect.</li>
        <li>Clean up after yourself if you create files in shared dirs.</li>
      </ol>
    </div>
  );
}
```

- [ ] **Step 5: Create `src/app/donate/page.tsx`**

```tsx
export default function DonatePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Donate</h1>
      <p>Crypto donations via BTCPay arrive in Plan 07.</p>
    </div>
  );
}
```

- [ ] **Step 6: Create `src/app/login/page.tsx`**

```tsx
export default function LoginPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Login</h1>
      <p className="text-muted">Authentication arrives in Plan 02.</p>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/app/register/page.tsx`**

```tsx
export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-amber text-xl">Register</h1>
      <p className="text-muted">Authentication arrives in Plan 02.</p>
    </div>
  );
}
```

- [ ] **Step 8: Verify all routes render**

```bash
npm run dev
```

Visit each: `/`, `/tracks/ghost`, `/leaderboard`, `/rules`, `/donate`, `/login`, `/register`. Expected: every page renders with the sidebar; no 404s.

Stop the server.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(foundation): add stub pages for all v1 routes"
```

---

## Task 10: Smoke E2E test (Playwright)

**Files:**
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write the smoke spec**

```ts
import { test, expect } from "@playwright/test";

const ROUTES = [
  "/",
  "/tracks/ghost",
  "/leaderboard",
  "/rules",
  "/donate",
  "/login",
  "/register",
];

test.describe("smoke", () => {
  for (const route of ROUTES) {
    test(`renders ${route} with sidebar`, async ({ page }) => {
      await page.goto(route);
      await expect(page.getByText("BreachLab", { exact: false })).toBeVisible();
      await expect(page.getByRole("link", { name: /donate/i })).toBeVisible();
    });
  }

  test("/api/health responds 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });
});
```

- [ ] **Step 2: Run the smoke test**

```bash
npm run test:e2e
```

Expected: 8 tests pass (7 routes + 1 health). Playwright auto-starts the dev server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(foundation): add Playwright smoke E2E across v1 routes"
```

---

## Task 11: Drizzle + Postgres scaffolding (no real tables yet)

**Files:**
- Create: `drizzle.config.ts`
- Create: `src/lib/db/client.ts`
- Create: `src/lib/db/schema.ts`
- Create: `.env.example`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Install Drizzle and Postgres driver**

```bash
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

- [ ] **Step 2: Create `.env.example`**

```
DATABASE_URL=postgres://breachlab:breachlab@localhost:5432/breachlab
NODE_ENV=development
```

- [ ] **Step 3: Create `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://breachlab:breachlab@localhost:5432/breachlab",
  },
});
```

- [ ] **Step 4: Create `src/lib/db/schema.ts`**

```ts
// Real tables are added in Plan 02 onward.
// This file exists so drizzle-kit has a target.
export const _placeholder = true;
```

- [ ] **Step 5: Create `src/lib/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const queryClient = postgres(url);
export const db = drizzle(queryClient);
```

- [ ] **Step 6: Add scripts to `package.json`**

In `scripts`:

```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push"
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(foundation): scaffold Drizzle ORM and Postgres client"
```

---

## Task 12: Dockerfile for the Next.js app

**Files:**
- Create: `Dockerfile`
- Modify: `next.config.ts` (output: standalone)

- [ ] **Step 1: Enable standalone output**

Replace `next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/public ./public
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
USER app
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
```

- [ ] **Step 3: Build the image locally to verify**

```bash
docker build -t breachlab-platform:dev .
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "build(foundation): add multi-stage Dockerfile with standalone output"
```

---

## Task 13: docker-compose for web + db + caddy

**Files:**
- Create: `docker-compose.yml`
- Create: `Caddyfile`
- Modify: `.gitignore` (add `.env`, `caddy_data`, `caddy_config`)

- [ ] **Step 1: Create `Caddyfile`**

For local testing, use `:80` so Caddy doesn't try to fetch certs. Production overrides this with the real domain via env (Task 14).

```caddy
{
    email admin@breachlab.io
}

:80 {
    encode zstd gzip
    reverse_proxy web:3000
}
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-breachlab}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-breachlab}
      POSTGRES_DB: ${POSTGRES_DB:-breachlab}
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-breachlab}"]
      interval: 10s
      timeout: 5s
      retries: 5

  web:
    build: .
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-breachlab}:${POSTGRES_PASSWORD:-breachlab}@db:5432/${POSTGRES_DB:-breachlab}
      NODE_ENV: production
    depends_on:
      db:
        condition: service_healthy
    expose:
      - "3000"

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - web

volumes:
  db_data:
  caddy_data:
  caddy_config:
```

- [ ] **Step 3: Update `.gitignore`**

Append to `.gitignore`:

```
.env
.env.local
caddy_data/
caddy_config/
```

- [ ] **Step 4: Bring the stack up locally and verify**

```bash
docker compose up -d --build
sleep 5
curl -fsS http://localhost/api/health
```

Expected: `{"status":"ok"}`.

Then bring it down:

```bash
docker compose down
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "build(foundation): add docker-compose with web, db, and Caddy"
```

---

## Task 14: Production Caddyfile and environment template

**Files:**
- Create: `Caddyfile.prod`
- Create: `.env.production.example`
- Create: `README.md`

- [ ] **Step 1: Create `Caddyfile.prod`**

```caddy
{
    email admin@breachlab.io
}

breachlab.io, www.breachlab.io {
    encode zstd gzip
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
        X-Frame-Options "DENY"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
    reverse_proxy web:3000
}
```

- [ ] **Step 2: Create `.env.production.example`**

```
POSTGRES_USER=breachlab
POSTGRES_PASSWORD=CHANGE_ME_BEFORE_DEPLOY
POSTGRES_DB=breachlab
DATABASE_URL=postgres://breachlab:CHANGE_ME_BEFORE_DEPLOY@db:5432/breachlab
NODE_ENV=production
```

- [ ] **Step 3: Create `README.md`**

```markdown
# BreachLab Platform

The web platform behind `breachlab.io`. Foundation skeleton — auth, leaderboards, donations land in subsequent plans.

## Local development

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`

Then `http://localhost:3000`.

## Tests

\`\`\`bash
npm test            # unit (Vitest)
npm run test:e2e    # smoke (Playwright)
\`\`\`

## Local docker stack

\`\`\`bash
docker compose up -d --build
curl http://localhost/api/health
\`\`\`

## Production deploy (VPS)

1. Copy the repo to the VPS at `&lt;vps-ip&gt;`.
2. `cp .env.production.example .env` and fill in real values (set a strong `POSTGRES_PASSWORD`).
3. `cp Caddyfile.prod Caddyfile`
4. Make sure DNS A records for `breachlab.io` and `www.breachlab.io` point to the VPS.
5. `docker compose up -d --build`
6. `curl https://breachlab.io/api/health`

## Specs and plans

`docs/superpowers/specs/` and `docs/superpowers/plans/`.
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs(foundation): production Caddyfile, env template, and README"
```

---

## Task 15: Configure DNS and deploy to VPS (manual + verified)

This task is a manual sequence with verification commands. The engineer running it must have SSH access to the VPS and Namecheap admin access.

**Prerequisites:**
- `breachlab.io` is renewed at Namecheap (action item from spec — must be done before April 24).
- The VPS at `&lt;vps-ip&gt;` has Docker and Docker Compose installed.

- [ ] **Step 1: Add DNS A records at Namecheap**

In Namecheap → Domain List → `breachlab.io` → Advanced DNS, add:

| Type | Host | Value | TTL |
|---|---|---|---|
| A | @ | &lt;vps-ip&gt; | Automatic |
| A | www | &lt;vps-ip&gt; | Automatic |
| A | ghost | &lt;vps-ip&gt; | Automatic |
| A | pay | &lt;vps-ip&gt; | Automatic |

- [ ] **Step 2: Verify DNS propagation**

From your local machine:

```bash
dig +short breachlab.io
dig +short www.breachlab.io
```

Expected: both return `&lt;vps-ip&gt;`. May take a few minutes after creating records.

- [ ] **Step 3: Push the repo to a remote and pull on the VPS**

If a remote does not yet exist, create a private repo on GitHub and push:

```bash
gh repo create atobones/breachlab-platform --private --source=. --remote=origin --push
```

Then on the VPS:

```bash
ssh root@&lt;vps-ip&gt;
cd /opt
git clone git@github.com:atobones/breachlab-platform.git
cd breachlab-platform
```

- [ ] **Step 4: Configure environment on the VPS**

```bash
cp .env.production.example .env
# Edit .env: set a strong POSTGRES_PASSWORD and matching DATABASE_URL
nano .env
cp Caddyfile.prod Caddyfile
```

- [ ] **Step 5: Bring the stack up**

```bash
docker compose up -d --build
docker compose ps
```

Expected: `db`, `web`, `caddy` all `Up`/`healthy`.

- [ ] **Step 6: Verify HTTPS works end-to-end**

From your local machine:

```bash
curl -fsS https://breachlab.io/api/health
```

Expected: `{"status":"ok"}` and a valid Let's Encrypt certificate (Caddy issued it automatically on first request).

Open `https://breachlab.io` in a browser. Expected: BreachLab sidebar visible, home page text rendered.

- [ ] **Step 7: Commit any VPS-side fixes back to the repo**

If anything had to be changed during deploy, commit it:

```bash
git add -A
git commit -m "fix(foundation): production deploy adjustments"
git push
```

---

## Task 16: Final sanity sweep and tag the milestone

- [ ] **Step 1: Run the entire test suite locally**

```bash
npm test && npm run test:e2e
```

Expected: all tests pass.

- [ ] **Step 2: Confirm the production site renders**

```bash
curl -fsS https://breachlab.io/api/health
curl -fsS https://breachlab.io/ | grep -q "BreachLab"
```

Expected: both succeed.

- [ ] **Step 3: Tag the milestone**

```bash
git tag -a v0.1.0-foundation -m "BreachLab Platform foundation: skeleton deployed to breachlab.io"
git push --tags
```

- [ ] **Step 4: Update the project note in Obsidian**

Append a Changelog entry to `~/Documents/Obsidian Vault/Claude Brain/Projects/BreachLab.md` noting that the platform foundation is live.

---

## Spec Coverage Check

- §2 Architecture (Caddy + Next.js + Postgres on VPS) → Tasks 11–15
- §3 Subdomains & DNS → Task 15
- §4 Tech stack (Next 15, TS, Tailwind v4, Drizzle, Postgres, Vitest, Playwright, Caddy) → Tasks 1–3, 11–13
- §7 UI sidebar layout + palette + JetBrains Mono + page list → Tasks 2, 6–9
- §9 v1 — foundation slice — auth, leaderboards, donations explicitly deferred to Plans 02–07
- §10 Open items: domain renewal flagged in Task 15 prerequisites; xpub / SMTP / Discord deferred to plans where they are first used
