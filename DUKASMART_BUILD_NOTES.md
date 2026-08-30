# DukaSmart focused MVP build notes

## Built in this pass

### 1. Secure stock authority
- Stock-changing transaction paths remain atomic and idempotent.
- Direct client writes to stock-bearing transaction tables are revoked.
- `products.current_stock` has a fail-closed direct-write guard.
- Audit rows are server-generated only.
- Internal SECURITY DEFINER helpers are no longer client-callable.
- Product update validates category/supplier ownership.
- Business self-enrollment into arbitrary businesses is blocked by the prior migration.

### 2. Fast Sales
- Search-first POS surface.
- Favorite/popular products appear first.
- One-tap product adding.
- Quantity can be changed directly instead of repeated tapping.
- Availability is shown beside each cart line.
- Clear-cart action regenerates the idempotency token.
- Final confirmation stays on the protected `create_sale` RPC.
- Failed sales refresh product stock so the cart does not remain stale.

### 3. VoiceSheet
- Explicit Kinyarwanda, English, French and Kiswahili selection.
- Browser speech recognition when supported.
- Text fallback when speech recognition is unavailable.
- Deterministic multilingual parsing for common shop commands when the AI gateway is unavailable/out of credits.
- Confirmation before every stock-changing action.
- Voice command logging is server-shaped and tied to the signed-in user/business.
- Voice never writes stock directly.

### 4. Business Advisor
- Real-data advisor surface using the protected/isolated business data path.
- Sales trend, profit trend, best seller, restock risk, slow stock, strongest profit product, critical stock and best-day insights.

### 5. Stock History
- Real movement ledger with product/type/date filters.
- Return variants are grouped correctly.
- Before/after stock values and references are shown.

### 6. Modern UI
- Modern mobile-first shell.
- Clear primary sales CTA.
- Glass/backdrop treatment and rounded cards.
- Dashboard prioritizes actions, risk and money metrics.
- POS is optimized for speed and touch.

### 7. OCR safety
- OCR remains intentionally unconnected until a real provider is configured.
- When OCR is unavailable, it returns an empty zero-confidence result rather than fabricated invoice data.

## Verification performed here

- Static source audit: no direct client stock mutation calls were found.
- Static source audit: no direct client mutation calls were found for `sales`, `sale_items`, `purchases`, `purchase_items`, or `inventory_movements`.
- TypeScript parser pass was run with globally installed TypeScript; dependency-resolution errors remain because `node_modules` could not be installed in this environment. The earlier real duplicate-property error in `ai.functions.ts` was fixed.
- A full Vite/production build could not be honestly claimed in this environment because dependency installation timed out.

## Before deployment

1. Apply the migrations in `supabase/migrations/`, especially `20260829170000_security_hardening.sql` and `20260830090000_security_execute_hardening.sql`.
2. Install dependencies with `npm install` or use the project's Bun lockfile where Bun is available.
3. Run `npm run build` and `npm run lint`.
4. Run `SECURITY_TEST_PLAN.md` against two test businesses.
5. Test VoiceSheet on a current Chromium/Safari mobile browser with microphone permission enabled.
