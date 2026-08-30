# DukaSmart Security & Feature Pass

## Completed in this pass

### Stock security
- Removed authenticated direct INSERT/UPDATE/DELETE access from stock-bearing transaction tables.
- Removed direct product UPDATE access for authenticated users.
- Added `update_product(...)` as the protected product-edit RPC.
- Added a fail-closed `current_stock` trigger that rejects raw stock changes from client roles.
- Restored the stock guard trigger that was previously dropped without recreation.
- Removed the production `seed_demo_data()` callable entry point.
- Changed read-only analytics functions (`business_advisor`, `inventory_insights`, `dashboard_summary`) to SECURITY INVOKER so RLS remains the final read boundary.
- Closed the old `business_users` self-enrollment policy that allowed a signed-in user to attach themselves to an arbitrary business.

### Business Advisor
- Added `/advisor` route and UI.
- Uses the existing real-data `business_advisor()` function.
- Shows critical stock, sales/profit trends, fast sellers, restock risk, slow stock, strong-profit products, and best-day insight cards.
- Added refresh control and bilingual labels.

### VoiceSheet
- Existing voice flow still uses AI first.
- Added deterministic Kinyarwanda/English fallback parsing when the AI gateway is unavailable or out of credits.
- Preserved confirmation-before-commit behavior.
- Product price updates now use the protected `update_product()` RPC instead of direct table writes.

### Stock history
- Added `/stock` movement-history screen backed by real `inventory_movements` data.
- Product/type/date filters.
- Before/after stock values and movement references.
- Handles normal and return movement variants.

### Visual refresh
- Modernized app shell with translucent header/bottom navigation and wider responsive content area.
- Refreshed dashboard with a stronger hero action, business-focused cards, and clearer hierarchy.
- Added a modern Advisor surface consistent with the new visual language.
- Kept the existing Kinyarwanda-first language system.

## Verification status

Static source audit performed in this environment:
- No direct client mutations found for `sales`, `sale_items`, `purchases`, `purchase_items`, `inventory_movements`, or `products`.
- Protected transaction helpers remain the application write path.
- New migration is included in `supabase/migrations/20260829170000_security_hardening.sql`.

A fresh TypeScript/lint/Vite build could not be executed here because the runtime has Node but not Bun, and installing the dependency tree timed out before `node_modules` was created. The ZIP therefore does **not** claim a fresh local build verification.

## Deployment note

Apply the included Supabase migration before testing the new security model in a live project. Then run the normal project build/deploy through GitHub/Lovable.


## Additional safety hardening
- Internal SECURITY DEFINER helpers are no longer executable by `anon` or `authenticated` roles.
- Client-callable RPCs are explicitly allow-listed and keep authentication/business/role checks.
- Audit logs cannot be inserted, updated, or deleted directly by clients.
- Voice command logging now goes through a server-shaped RPC so caller/business identity is derived from the signed-in session.
- OCR never returns fabricated invoice items when no provider is configured; it returns an empty, zero-confidence result for manual review.
- Product updates validate category/supplier ownership against the current business.
