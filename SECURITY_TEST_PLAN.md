# DukaSmart security verification checklist

Apply migrations, sign in as two different businesses, then verify:

1. Authenticated user A cannot select business B's products, sales, purchases, movements, voice commands, or audit logs.
2. Authenticated user cannot directly UPDATE `products.current_stock`.
3. Authenticated user cannot INSERT/UPDATE/DELETE `inventory_movements` directly.
4. Authenticated user cannot INSERT/UPDATE/DELETE `audit_logs` directly.
5. `apply_movement` rejects direct client execution.
6. `current_business_id`, `current_role_in_business`, and `has_business_role` reject direct client execution.
7. `create_sale` derives the business from the session and ignores caller-supplied business identifiers.
8. Replaying the same `client_token` returns the original transaction and does not duplicate stock movement.
9. A sale that would take stock below zero fails atomically with no partial sale/movement rows.
10. A non-manager cannot call purchase, adjustment, return, product-create, or product-update RPCs.
11. Voice commands can only be logged for the current signed-in business/user.
12. Invoice storage paths outside the current business remain inaccessible.

Expected invariant: every stock quantity change has a corresponding movement row, and ordinary client roles cannot write the stock quantity or audit trail directly.
