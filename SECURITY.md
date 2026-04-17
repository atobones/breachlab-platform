# Security Policy

BreachLab is an offensive-security training platform. The **wargame levels themselves contain intentional vulnerabilities by design** — those aren't security issues, they're the point. This policy covers the platform that runs around the levels (the Next.js app, auth, sessions, leaderboard, etc.).

If you believe you've found a real security vulnerability in the platform code, please report it privately — **do NOT open a public GitHub issue**.

## How to report

- **Preferred:** GitHub Private Vulnerability Reporting → <https://github.com/atobones/breachlab-platform/security/advisories/new>
- **Fallback:** email `security@breachlab.org`

Please include:

- A clear description of the issue and its impact
- Steps to reproduce (a PoC request, minimal repro script, or recorded session is ideal)
- The commit hash or deployed version you tested against
- Any mitigating factors, required preconditions, or chaining you're aware of
- Your preferred attribution (handle, link, or anonymous)

## What to expect

- **Acknowledgement** within 48 hours
- **Initial triage + severity assessment** within 7 days
- For valid reports we'll keep you updated on the fix, coordinate a disclosure timeline, and credit you in the advisory unless you request anonymity

We support [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure). Please give us a reasonable window to fix before publishing.

## In scope

- Anything in this repository (`breachlab-platform`)
- Authentication, session management, rate limiting, permission boundaries
- Secret handling, CSRF, XSS, SSRF, SQL / NoSQL / command injection
- Privilege escalation between BreachLab accounts
- Flag submission integrity, leaderboard manipulation, badge forgery
- Webhook / OAuth handling (Discord, GitHub Sponsors, Liberapay)
- Infrastructure-as-code config in this repo

## Out of scope

- The wargame challenges themselves — every level is deliberately vulnerable
- Issues that require the attacker to already hold a level's user password (that's *playing the game*, not an exploit)
- Denial-of-service via brute force on auth when rate limiting is already in place (unless you demonstrate a bypass)
- Social engineering of BreachLab staff or players
- Any activity that would disrupt real players on the production deployment — please test against a local `docker compose` instance

## Safe-harbor commitment

As long as you operate in good faith within this policy, BreachLab will not pursue civil action or law-enforcement involvement for your research. Don't test techniques that would read, destroy, or exfiltrate other players' data; stop at proof-of-impact and report.

Thank you for helping keep BreachLab and its players safe.
