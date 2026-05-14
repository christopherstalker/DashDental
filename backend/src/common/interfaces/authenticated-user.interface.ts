export type AppRole = 'manager' | 'admin' | 'owner' | 'super_admin';

export interface AuthenticatedUser {
  userId: string;
  organizationId: string;
  role: AppRole;
  email: string;
  sessionId: string;
}
