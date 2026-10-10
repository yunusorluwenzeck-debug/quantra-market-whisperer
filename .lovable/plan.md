# Security & privacy hardening (spec 13)

## Already in place
- Every table has row-level security; personal tables (portfolio, trades, lists, alerts, autopilot) are readable only by their owner.
- All paper trades go through one locked-down database function; browsers cannot write cash or positions.
- Autopilot has trade/exposure/loss/drawdown limits and an emergency stop, enforced on the server, not by the AI.
- Email alert panel is owner-only; Gmail tokens are held by the managed connector, never in the browser or database.
- No secret keys in frontend code; all traffic is HTTPS.
- Real-money trading is not implemented.

## What this plan adds
1. **Security status page** (owner-only) built from real checks run on the server:
   - Which tables have row-level security and policies
   - Signed-out read test on every private table (expects zero rows)
   - Gmail connection status and last successful send
   - Last background job runs, last test run, open warnings
   - Backups shown as "Managed by Lovable Cloud — restore testing not available to the app" (no fake green)
2. **Activity & security log**: a `security_events` table (owner-readable, server-written) recording sign-ins, settings changes, autopilot toggles, emergency stops, failed owner checks. Never stores tokens or passwords.
3. **Duplicate / replay protection** for trades: optional idempotency key on manual orders so a double-click or replayed request can't place two trades.
4. **Input validation sweep**: confirm every server function validates input with strict schemas and returns generic error messages (no stack traces or database details).
5. **Secure HTTP headers**: add content-security, frame, referrer and content-type headers to all responses.
6. **Your data controls**: "Export my data" (JSON download of your portfolio, trades, lists, alerts, logs) and "Delete my data" (with re-confirmation).
7. **Retention**: auto-delete autopilot decision logs and security events older than 180 days; finished email sequences after 90 days.
8. **AI data minimisation**: confirm AI reports receive only public market data — never balances, holdings or account info — and document this on the status page with the list of outside providers (Yahoo Finance, Lovable AI, Gmail).
9. **Prompt-injection guard**: treat news/API text as data in AI prompts; AI output can never change trade limits or settings.
10. **Live-trading lock**: a server-side gate that refuses any future real-money mode while critical checks fail.
11. **Tests**: extend automated tests for cross-user access, unauthorized trading requests, and the two-account email check (once a second account exists).

## Limits to be honest about
- Database backups and encryption at rest are handled by Lovable Cloud; the app cannot run or verify restore drills itself.
- Rate limiting is basic (per-job guards); there is no built-in per-user request throttling.
- Suspicious-login detection is limited to logging; no automatic lockout.
- Nothing is "unhackable"; the status page will state this.

## Technical notes
- `security_events(id, user_id, kind, detail jsonb, created_at)`: RLS select-own + owner select-all, inserts via server only.
- Status checks run in a `requireSupabaseAuth` + owner-guarded server function; signed-out probe uses the publishable key.
- Headers via request middleware in `src/start.ts`.
- Retention via pg_cron daily SQL delete.
