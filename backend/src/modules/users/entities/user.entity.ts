export type UserStatus = 'active' | 'invited' | 'disabled';

export interface UserEntity {
  id: string;
  email: string;
  name: string;
  avatar: string;
  status: UserStatus;
  lastLoginAt?: string;
}
