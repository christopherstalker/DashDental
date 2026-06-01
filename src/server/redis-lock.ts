import crypto from "node:crypto";
import Redis from "ioredis";
import { ApiError } from "./api-error";
import { isProductionRuntime } from "./feature-flags";
import { structuredLog } from "./observability";

let redisClient: Redis | undefined;

function getRedisUrl(): string | undefined {
  return process.env.REDIS_URL?.trim() || undefined;
}

function getRedisClient(): Redis | undefined {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    if (isProductionRuntime()) {
      throw new ApiError(
        503,
        "REDIS_URL is required for production distributed locks.",
        "redis_lock_not_configured",
      );
    }
    return undefined;
  }

  redisClient ??= new Redis(redisUrl, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  return redisClient;
}

async function releaseLock(client: Redis, key: string, token: string) {
  await client.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    1,
    key,
    token,
  );
}

export async function withRedisLease<T>(input: {
  key: string;
  ttlSeconds: number;
  onLockUnavailable: () => T | Promise<T>;
  run: () => T | Promise<T>;
}): Promise<T> {
  const client = getRedisClient();
  if (!client) {
    structuredLog("warn", "redis_lock.skipped", {
      key: input.key,
      reason: "redis_not_configured",
    });
    return input.run();
  }

  const token = crypto.randomUUID();
  const acquired = await client.set(input.key, token, "EX", input.ttlSeconds, "NX");
  if (acquired !== "OK") {
    structuredLog("info", "redis_lock.busy", { key: input.key });
    return input.onLockUnavailable();
  }

  try {
    return await input.run();
  } finally {
    await releaseLock(client, input.key, token).catch((error) => {
      structuredLog("warn", "redis_lock.release_failed", {
        key: input.key,
        error: error instanceof Error ? error.name : "unknown_error",
      });
    });
  }
}
