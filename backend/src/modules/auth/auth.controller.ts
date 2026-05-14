import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@app/common/decorators/current-user.decorator';
import { Public } from '@app/common/decorators/public.decorator';
import type { AuthenticatedUser } from '@app/common/interfaces/authenticated-user.interface';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @Get('oidc/callback/:code')
  oidcCallback(@Param('code') code: string) {
    return this.authService.resolveOidcCallback(code);
  }

  @Post('logout')
  logout(@CurrentUser() user?: AuthenticatedUser) {
    return this.authService.logout(user?.sessionId ?? 'unknown-session');
  }
}
