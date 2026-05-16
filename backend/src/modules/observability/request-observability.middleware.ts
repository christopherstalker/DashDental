import * as crypto from 'node:crypto';
import {
  Injectable,
  Logger,
  type NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

type ObservableRequest = Request & {
  correlationId?: string;
  user?: Partial<AuthenticatedUser>;
};

function readHeader(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.find((entry) => entry.trim())?.trim();
  }

  return value?.trim() || undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readOrganizationId(request: ObservableRequest): string | undefined {
  return (
    request.user?.organizationId ??
    readString(asRecord(request.params)?.organizationId) ??
    readString(asRecord(request.query)?.organizationId) ??
    readString(asRecord(request.body)?.organizationId)
  );
}

function readRequestIp(request: Request): string | undefined {
  const forwardedFor = readHeader(request.headers['x-forwarded-for']);
  return forwardedFor?.split(',')[0]?.trim() || request.ip;
}

function requestPath(request: Request): string {
  const path = request.path || request.originalUrl || request.url;
  return path.split('?')[0] || '/';
}

@Injectable()
export class RequestObservabilityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestObservabilityMiddleware.name);

  use(request: ObservableRequest, response: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();
    const correlationId =
      readHeader(request.headers['x-correlation-id']) ??
      readHeader(request.headers['x-request-id']) ??
      crypto.randomUUID();

    request.correlationId = correlationId;
    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    let logged = false;
    const logRequest = (event: 'http_request_completed' | 'http_request_aborted') => {
      if (logged) {
        return;
      }

      logged = true;
      const durationMs = Number(
        (process.hrtime.bigint() - startedAt) / BigInt(1_000_000),
      );
      const statusCode = response.statusCode;
      const payload = {
        event,
        correlationId,
        method: request.method,
        path: requestPath(request),
        statusCode,
        durationMs,
        organizationId: readOrganizationId(request),
        userId: request.user?.userId,
        role: request.user?.role,
        ip: readRequestIp(request),
        userAgent: readHeader(request.headers['user-agent']),
      };
      const line = JSON.stringify(payload);

      if (event === 'http_request_aborted' || statusCode >= 500) {
        this.logger.error(line);
        return;
      }

      if (statusCode >= 400) {
        this.logger.warn(line);
        return;
      }

      this.logger.log(line);
    };

    response.once('finish', () => logRequest('http_request_completed'));
    response.once('close', () => {
      if (!response.writableEnded) {
        logRequest('http_request_aborted');
      }
    });

    next();
  }
}
