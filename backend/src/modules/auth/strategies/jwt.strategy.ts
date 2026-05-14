import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';

interface JwtPayload extends AuthenticatedUser {
  sub: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('auth.accessSecret');
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is required.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.userId ?? payload.sub,
      organizationId: payload.organizationId,
      role: payload.role,
      email: payload.email,
      sessionId: payload.sessionId,
    };
  }
}
