import type { AppRole } from '../interfaces/authenticated-user.interface';

const roleRank: Record<AppRole, number> = {
  manager: 1,
  admin: 2,
  owner: 3,
  super_admin: 4,
};

export function hasRequiredRole(actual: AppRole, required: AppRole): boolean {
  if (actual === 'super_admin') {
    return true;
  }

  if (required === 'super_admin') {
    return false;
  }

  return roleRank[actual] >= roleRank[required];
}
