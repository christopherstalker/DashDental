# Dental Recovery Backend Architecture

NestJS backend scaffold for the Dental Recovery SaaS. The current shape is a `modular monolith` designed to serve a multi-tenant dashboard, inbox, integration layer, billing, and async processing with PostgreSQL + Redis.

## Stack

- `NestJS 11` for the HTTP API and module boundaries
- `PostgreSQL` as the source of truth for tenant, lead, billing, and audit data
- `Redis` + `BullMQ` for queues, retries, locks, and webhook decoupling
- `Prisma` infrastructure placeholder for the database client
- `JWT` + `Passport` for dashboard sessions and service auth

## Folder Structure

```text
backend/
  src/
    app.module.ts
    main.ts
    config/
    common/
      decorators/
      guards/
      interfaces/
      rbac/
    infra/
      crypto/
      prisma/
      queue/
      redis/
    modules/
      admin/
      ai/
      audit/
      auth/
      automations/
      billing/
      compliance/
      inbox/
      integrations/
        adapters/
      jobs/
        processors/
      leads/
      memberships/
      organizations/
      usage/
      users/
      webhooks/
```

## Module Boundaries

- `auth`: password login, OIDC callback resolution, refresh/logout, JWT strategy.
- `organizations`: tenant provisioning, clinic settings, workspace metadata.
- `users`: identity profile lookups and lifecycle hooks.
- `memberships`: user-to-organization role binding.
- `leads`: lead pipeline, status transitions, webhook upsert points.
- `inbox`: conversations, messages, manager replies.
- `automations`: SLA triggers, auto-reply rules, toggleable policies.
- `integrations`: adapter registry, Clinic DB sync entrypoints, credentials flow.
- `webhooks`: public ingestion endpoints with idempotent async queue handoff.
- `ai`: summary/risk/intent generation entrypoints and future metering hooks.
- `billing`: manual-launch subscription state plus deferred Stripe checkout,
  portal, and webhook sync structure.
- `usage`: per-plan counters and enforcement service surface.
- `compliance`: data access contract and export surface.
- `audit`: append-only business action trail.
- `admin`: super-admin cross-tenant read model.
- `jobs`: BullMQ workers for webhook, SLA, sync, AI, and billing processing.

## Core Entities

The scaffold models the main bounded contexts as entity interfaces:

- `OrganizationEntity`
- `UserEntity`
- `MembershipEntity`
- `LeadEntity`
- `LeadStatusHistoryEntity`
- `ConversationEntity`
- `MessageEntity`
- `IntegrationEntity`
- `IntegrationEventEntity`
- `WebhookEventEntity`
- `AutomationRuleEntity`
- `AiInsightEntity`
- `SubscriptionEntity`
- `BillingCustomerEntity`
- `UsageCounterEntity`
- `DataAccessContractEntity`
- `AuditLogEntity`

These interfaces are the contract for the future Prisma schema and repository layer.

## Services

Each module exposes one narrow service that owns its bounded context:

- `AuthService`: login, refresh, logout, OIDC resolution
- `OrganizationsService`: clinic workspace provisioning and settings
- `UsersService`: user lookup and last-login touchpoints
- `MembershipsService`: membership and role reads
- `LeadsService`: pipeline reads, state transitions, webhook upsert
- `InboxService`: thread reads and outbound manager replies
- `AutomationsService`: rule listing and toggles
- `IntegrationsService`: adapter orchestration and Clinic DB sync kickoff
- `WebhooksService`: intake + enqueue
- `AiService`: summary enqueue / retrieval surface
- `BillingService` + `StripeService`: manual-mode gate plus deferred checkout,
  portal, and subscription sync
- `UsageService`: plan counters and limit checks
- `ComplianceService`: contract approval and export flow
- `AuditService`: append-only audit write surface
- `AdminService`: platform-wide overview

## Queue Topology

Queues live in [src/infra/queue/queue.names.ts](./src/infra/queue/queue.names.ts).

- `webhook.ingest`: stores raw events and deduplicates by provider event id
- `webhook.process`: normalizes provider payloads into lead/message changes
- `automation.execute`: auto replies and policy actions
- `sla.sweep`: promotes leads into `unanswered` and `at_risk`
- `clinic-db.sync`: read-only Clinic DB import jobs
- `ai.summary`: AI summary/risk/intent jobs
- `billing.webhook`: async online-provider webhook synchronization
- `billing.usage-rollup`: usage aggregation per billing period
- `audit.export`: compliance and audit package generation
- `dead-letter`: terminal failures after retry budget is exhausted

The processors in `src/modules/jobs/processors/` are the entrypoints for the worker runtime.

Production requires `REDIS_URL`. Local development falls back to
`redis://localhost:6379`, which is provided by the root `docker-compose.yml`.
Do not rely on the localhost fallback in hosted environments; missing Redis
prevents durable webhook and outbound outbox processing from starting.

## Webhook Processing Flow

1. Public controller receives provider webhook.
2. Signature validation happens at the controller/service edge.
3. Raw payload is accepted quickly and queued via `webhook.ingest`.
4. Worker persists raw event metadata and idempotency key.
5. Normalization fan-out updates `Lead`, `Conversation`, `Message`, and `IntegrationEvent`.
6. Secondary jobs can enqueue `automation.execute`, `sla.sweep`, `ai.summary`, or `billing.webhook`.
7. Failures are retried with BullMQ backoff and eventually routed to `dead-letter`.

## Integrations Layer

The integrations module uses an adapter pattern:

- `IntegrationAdapter` defines the health contract.
- `ReadonlySyncAdapter` marks adapters that can import data from external systems.
- `TelegramAdapter` and `WebFormAdapter` represent inbound messaging channels.
- `ClinicDbAdapter` is the tenant-scoped read-only PostgreSQL ingestion adapter.

This keeps provider-specific behavior behind stable internal contracts so the API layer only talks to `IntegrationsService`.

## Auth Strategy

- Public endpoints are marked with `@Public()`.
- All other routes pass through global `APP_GUARD`s:
  - `JwtAuthGuard`
  - `OrganizationGuard`
  - `RolesGuard`
- JWT payload carries `userId`, `organizationId`, `role`, `email`, `sessionId`.
- `CurrentUser` decorator resolves the authenticated actor from the request.
- Sensitive actions such as lead status changes and replies now derive `actorUserId` from the token instead of trusting request bodies.

## RBAC

Supported roles:

- `manager`
- `admin`
- `owner`
- `super_admin`

RBAC is implemented in `src/common/rbac/role-policy.ts` and applied with `@Roles(...)`.

- `manager`: lead queue, inbox, tenant data access
- `admin`: integrations, compliance, operational controls
- `owner`: billing, workspace lifecycle, all tenant operations
- `super_admin`: cross-tenant platform overview

`OrganizationGuard` blocks cross-organization access unless the caller is `super_admin`.

## Billing Structure

Billing is isolated behind `billing/`:

- `BillingController` exposes checkout and portal endpoints for online billing.
- `BillingService` owns the domain behavior and blocks those endpoints while
  `BILLING_PROVIDER=manual`.
- `StripeService` is the Stripe-facing boundary when Stripe is explicitly selected.
- `SubscriptionEntity` and `BillingCustomerEntity` model subscription state,
  including external provider ids when an online provider is enabled.
- `UsageService` is where plan enforcement plugs into AI, messaging, user seats, and integrations.

## Audit Logs

`AuditService` is the append-only entrypoint for business actions:

- actor id
- organization id
- action
- entity type / entity id
- metadata JSON
- timestamp

Keep `audit logs` separate from `integration events`:

- `audit`: who did what inside the product
- `integration events`: what external processing happened and why

## Scaling Recommendations

- Keep `API` and `worker` processes separate even while staying a modular monolith.
- Add Prisma repositories and PostgreSQL indexes around:
  - `organizationId`
  - `status`
  - `createdAt`
  - `providerEventId`
  - `providerThreadId`
- Use Redis for:
  - queue transport
  - rate limiting
  - idempotency cache
  - tenant sync locks
- Enforce one active `clinic-db.sync` job per organization.
- Partition high-growth tables later:
  - `messages`
  - `audit_logs`
  - `webhook_events`
  - `integration_events`
- Move analytics-heavy reads to replicas once the dashboard grows.
- Keep credentials encrypted and rotate secrets outside code.
- Add metrics for:
  - queue lag
  - webhook failure rate
  - sync duration
  - SLA breach count
  - AI cost per tenant

## Local Development

```bash
cd backend
npm install
npm run typecheck
npm run build
```

Provide at minimum:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `STRIPE_SECRET_KEY`
- `ENCRYPTION_KEY`

See [`.env.example`](./.env.example) for the full backend env surface.
