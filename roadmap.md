# RTFlow production roadmap

Brand: **RTFlow** (legacy: Vuga Smart / DukaSmart). Rename visible copy only, not DB/routes.

## Phase 1 — Data foundation (in progress)
- [ ] Expenses table + RPC
- [ ] Credit sales: payment_status, amount_paid on sales; debts + debt_payments
- [ ] 5-day trial: trial_started_at/ends_at, subscription_status on businesses; server-enforced write gate
- [ ] Platform admin role (separate from shop roles) + platform settings (owner contact)
- [ ] Employee mode flag + attendant permissions
- [ ] Read-only analyst report functions (daily/weekly/monthly)

## Phase 2 — Reliability / cleanup
- [ ] Remove invoice OCR + browser voice from production core (keep code out of nav)
- [ ] Confirmation dialogs on all destructive/important actions

## Phase 3 — Interfaces
- [ ] Polished POS (search, cards, cart, payment mode incl. credit, confirm screen)
- [ ] Polished Receive Stock (supplier, lines, confirm screen)
- [ ] Products (badges, detail with sales/purchase/stock history)
- [ ] Debtors page + copyable reminder text
- [ ] Dashboard morning briefing
- [ ] Reports: daily / weekly / monthly
- [ ] Expenses page
- [ ] Notification centre (in-app, derived from real data)
- [ ] AI Business Analyst chat (read-only DB functions -> AI explains)
- [ ] Subscription / access page
- [ ] Platform admin console

## Phase 4 — Verification
- [ ] Stock math, duplicate protection, negative stock
- [ ] Shop A / Shop B isolation
- [ ] Trial expiry enforced server-side
- [ ] Credit not counted as collected cash; expenses in reports
