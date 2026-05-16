# Clinic Onboarding Runbook

Use this checklist during the first sales-assisted onboarding call.

## Before The Call

- Confirm the clinic owner email and clinic name.
- Confirm timezone and currency.
- Prepare the support email and billing support email.
- Run `npm run go-live:check` for the launch hostname if this is a paid clinic.
- Keep the admin console open at `/platform/subscriptions`.

## Call Script

1. Register or open the clinic workspace.
2. Invite the owner, admin, and reception users.
3. Explain the 14-day trial:
   - workspace opens before payment;
   - billing and setup stay reachable after trial;
   - live recovery actions require active paid access after trial.
4. Connect web form first because it is easiest to verify.
5. Send a test lead using a non-patient test contact.
6. Confirm the test lead appears in inbox, work queue, and dashboard.
7. Show the owner where money at risk, unanswered patients, and saved revenue live.
8. Show reception where to see who needs a reply first.
9. Explain Ask AI:
   - it can draft and summarize;
   - it does not make medical decisions;
   - staff must review replies before sending.
10. Confirm support process and business-day response expectation.

## Success Criteria

- Owner can log in.
- Reception can find the inbox and work queue.
- Test lead appears in dashboard and inbox.
- First reply can be drafted or sent from the inbox.
- Billing page explains trial, manual invoice, and read-only lock.
- Clinic understands data handling boundaries.

## After The Call

- If payment is confirmed, grant the selected plan in `/platform/subscriptions`.
- Add invoice reference to the admin grant form.
- Verify audit logs contain `subscription.manual_activated`.
- Send the clinic a short summary with support contact, billing contact, and next setup step.
