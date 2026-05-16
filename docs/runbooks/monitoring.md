# Monitoring Runbook

Use this before onboarding each clinic until scheduled monitors are proven.

## Manual Smoke

Run:

```bash
npm run go-live:check
```

Then verify the launch hostname:

- `/`
- `/pricing`
- `/register`
- `/login`
- `/security`
- `/privacy`
- `/terms`
- `/qa`
- `/demo`
- `/trial`

Expected result: pages load without 403, redirect loops, or secret exposure.

## Synthetic Monitor

- Preview monitor: `npm run monitor:preview`.
- Full monitor: `npm run monitor:synthetic:guarded`.
- Full production monitor requires explicit approval for the production monitor tenant and cleanup policy.

## Health Secrecy

Health endpoints must not expose:

- database URLs;
- Redis URLs;
- tokens;
- secrets;
- passwords;
- provider credentials;
- private bank details.

## Launch Week Review

Daily during first clinics:

1. Review Vercel logs for route errors.
2. Review platform health and queue alerts.
3. Check synthetic monitor results.
4. Check registration to setup conversion.
5. Check inbox reply failures.
6. Check manual billing requests and subscription grants.
