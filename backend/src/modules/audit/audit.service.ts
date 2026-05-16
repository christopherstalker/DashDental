import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@app/infra/prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async append(input: {
    organizationId?: string;
    actorUserId: string;
    action: string;
    entityType: string;
    entityId: string;
    ip?: string;
    metadataJson?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadataJson: (input.metadataJson ?? {}) as Prisma.InputJsonValue,
        ip: input.ip?.trim() || 'system',
      },
    });
  }
}
