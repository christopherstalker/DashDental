import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class OrganizationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      user?: AuthenticatedUser;
      params?: Record<string, string>;
      body?: { organizationId?: string };
      query?: { organizationId?: string };
    }>();

    const user = request.user;
    const requestedOrganizationId =
      request.body?.organizationId ??
      request.query?.organizationId ??
      request.params?.organizationId;

    if (!user || user.role === 'super_admin' || !requestedOrganizationId) {
      return true;
    }

    if (user.organizationId !== requestedOrganizationId) {
      throw new ForbiddenException('Cross-organization access is not allowed.');
    }

    return true;
  }
}
