import { ApiError } from "@/server/api-error";
import { getStorageConfiguration } from "@/server/data-store";
import { getBillingProvider } from "@/server/manual-billing";
import { assertPublicRouteRateLimit } from "@/server/public-route-rate-limit";
import { isStripeConfigured } from "@/server/stripe";
import { prisma } from "@/server/prisma";
import {
  collectRuntimeMetrics,
  getQueueHealthInput,
  summarizeRuntimeHealth,
} from "@/server/runtime-health";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    assertPublicRouteRateLimit(request, { route: "health_storage" });

    const configuration = getStorageConfiguration();
    const database =
      configuration.driver === "prisma"
        ? await checkPrisma()
        : {
            ok: true,
            status: "not_used" as const,
            message: "File-backed storage is active for local development or build-time rendering.",
          };
    const metrics = await collectRuntimeMetrics();
    const billingProvider = getBillingProvider();
    const stripeRequired = billingProvider === "stripe" || billingProvider === "hybrid";
    const health = summarizeRuntimeHealth({
      productionRuntime: configuration.productionRuntime,
      storage: {
        ok: configuration.driver === "file" || database.ok,
        status: database.status,
        latencyMs: "latencyMs" in database ? database.latencyMs : undefined,
      },
      queue: getQueueHealthInput(),
      stripe: {
        configured: isStripeConfigured(),
        provider: billingProvider,
        required: stripeRequired,
      },
      metrics,
    });
    const healthy = health.status !== "unhealthy";

    return Response.json(
      {
        status: health.status,
        app: health.app,
        dependencies: health.dependencies,
        signals: health.signals,
        storage: {
          driver: configuration.driver,
          requestedDriver: configuration.requestedDriver,
          databaseUrlConfigured: configuration.databaseUrlConfigured,
          databaseUrlKind: configuration.databaseUrlConfigured
            ? configuration.databaseUrlIsLocal
              ? "local"
              : "remote"
            : "missing",
          productionRuntime: configuration.productionRuntime,
          productionBuild: configuration.productionBuild,
        },
        database,
      },
      { status: healthy ? 200 : 503 },
    );
  } catch (error) {
    const status = error instanceof ApiError ? error.status : 503;

    return Response.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Storage health check failed.",
        code: error instanceof ApiError ? error.code : "storage_health_failed",
      },
      { status },
    );
  }
}

async function checkPrisma() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`select 1`;

    return {
      ok: true,
      status: "reachable" as const,
      latencyMs: Date.now() - startedAt,
      message: "Prisma can reach Postgres.",
    };
  } catch {
    return {
      ok: false,
      status: "unreachable" as const,
      latencyMs: Date.now() - startedAt,
      message: "Postgres health query failed.",
    };
  }
}
