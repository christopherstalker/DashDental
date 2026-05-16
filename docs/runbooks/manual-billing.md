# Manual Billing Runbook

Use manual billing until Stripe self-serve is approved and rehearsed.

## Policy

- Default billing mode: `BILLING_PROVIDER=manual`.
- Activation happens only after payment confirmation.
- The invoice reference must be recorded in the admin grant form.
- Do not expose bank admin credentials, private account portal links, or secrets in the app.

## Before Sending An Invoice

- Confirm plan: Starter, Growth, or Scale.
- Confirm billing entity and contact email.
- Confirm currency and payment instructions.
- Confirm cancellation/refund policy is attached or linked.
- Confirm order form terms match the public pricing page.

## Activation Steps

1. Confirm payment arrived.
2. Open `/platform/subscriptions` as a super-admin.
3. Find the clinic row.
4. Select plan.
5. Select period.
6. Keep access mode as active paid access.
7. Enter invoice reference.
8. Click grant access.
9. Open the clinic workspace and verify paid routes are unlocked.
10. Confirm audit history records the actor, plan, reference, and period end.

## Late Payment Or Hold

1. Open `/platform/subscriptions`.
2. Find the clinic.
3. Set access mode to read-only hold.
4. Enter the invoice/reference reason.
5. Apply the change.
6. Confirm billing and setup stay reachable while live recovery actions are locked.

## Refunds And Cancellations

- Refunds are case-by-case.
- Cancellation stops future renewal charges.
- Data is not automatically deleted by cancellation.
- Export or deletion requests go through the support/legal process.
