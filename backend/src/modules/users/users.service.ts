import { Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  async findByEmail(email: string) {
    return { email };
  }

  async touchLastLogin(userId: string) {
    return { userId, updated: true };
  }
}
