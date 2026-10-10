<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Stock universe is a static JSON (src/lib/universe.server.json) seeded into `stocks` by the scanner; scanner re-scores stalest rows in batches of 20 symbols per Yahoo spark call — Yahoo caps spark at 20 symbols.
- Background work runs via pg_cron hitting /api/public/hooks/* with the publishable key; each handler is guarded by `claimJob` rate limits so replays are harmless — the key is public.
- All paper trades go through the `execute_paper_trade` SQL function (service_role only) — keeps cash/position updates atomic and blocks client tampering.
- Paper accounts are USD; non-USD stocks are converted with live FX at trade time (GBp = pence/100).
- Real-money trading is not implemented; never label simulated trades as real.
- Security-relevant actions are logged via `logEvent` in src/lib/security.server.ts into `security_events` (server-written, secrets scrubbed) — gives an audit trail without trusting the browser.
- Email-panel owner logic lives in src/lib/email-panel.server.ts with injectable deps — lets tests prove non-owners never reach privileged calls.
- Manual orders carry a one-time `clientKey` claimed in `order_keys` before trading — blocks double-submits and replays.
