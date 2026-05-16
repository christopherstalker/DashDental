import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  private assertMockAuthAllowed() {
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        'Backend mock auth is disabled in production.',
      );
    }
  }

  async login(credentials: LoginDto) {
    this.assertMockAuthAllowed();

    return {
      accessToken: this.jwtService.sign({
        sub: 'user-id',
        userId: 'user-id',
        organizationId: credentials.organizationId ?? 'org-id',
        role: 'owner',
        email: credentials.email,
        sessionId: 'session-id',
      }),
      refreshToken: 'refresh-token-placeholder',
      strategy: 'password',
    };
  }

  async refresh(input: RefreshTokenDto) {
    this.assertMockAuthAllowed();

    return {
      accessToken: this.jwtService.sign({
        sub: 'user-id',
        userId: 'user-id',
        organizationId: 'org-id',
        role: 'owner',
        email: 'owner@clinic.com',
        sessionId: input.refreshToken,
      }),
    };
  }

  async logout(sessionId: string) {
    return { revoked: true, sessionId };
  }

  async resolveOidcCallback(code: string) {
    this.assertMockAuthAllowed();

    return {
      code,
      strategy: 'oidc',
      nextStep: 'resolve identity, map membership, issue tokens',
    };
  }
}
