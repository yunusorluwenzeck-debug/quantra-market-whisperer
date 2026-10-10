# Roadmap
- [x] Universe of ~4,400 US+EU stocks, continuous quant scanner
- [x] Screener, stock detail, AI reports on top picks
- [x] Sign-in (email + Google), paper portfolio, manual trades
- [x] Autonomous paper trading bot with risk controls
- [x] Saved custom stock lists
- [x] Backtesting of the signal strategy
- [x] Price alerts (in-app)
- [x] Gmail 3-email opportunity sequence (enable on Autopilot page)
- [ ] Real broker connection — blocked: user's broker choice + API keys

- [ ] Payments: enable Stripe (paused — needs your go-ahead)
- [x] SEO review (sitemap added)
- [ ] Funds & ETF analysis, alerts, autopilot (spec 11)
- [ ] Avanza integration (spec 12) — needs verification of official API
- [ ] E2E tests: two real accounts — written; blocked: needs a second real account
- [x] Security & privacy hardening (spec 13)
- [x] Tests: non-owners cannot view/change/send test email
- [ ] Final audit & polish (spec: FINAL_TASK)
- [x] Suspicious sign-in protection: temporary lock + owner email notification
- [x] Per-user request limits (hourly, on trades, autopilot runs, settings, resets, test emails)
- [x] Suspicious-activity monitoring for failed Google sign-ins (log + owner email + security page)

- [x] Security spec pass: rate-limit public sign-in/alert endpoints, verify all endpoints reject unauthenticated calls
