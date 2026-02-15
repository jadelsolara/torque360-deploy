import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RegisterTenantDto, RegisterDto, RefreshTokenDto } from './auth.dto';
import { CurrentUser, Roles, Tenant } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  registerTenant(@Body() dto: RegisterTenantDto) {
    return this.authService.registerTenant(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('users')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  registerUser(@Body() dto: RegisterDto, @Tenant() tenantId: string) {
    return this.authService.registerUser(dto, tenantId);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser('sub') userId: string) {
    return this.authService.getProfile(userId);
  }
}
