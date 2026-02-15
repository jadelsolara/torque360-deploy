import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantsService } from './tenants.service';
import { CreateTenantDto, UpdateTenantSettingsDto } from './tenants.dto';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  @Post()
  @Roles('OWNER')
  create(@Body() dto: CreateTenantDto) {
    return this.tenantsService.create(dto);
  }

  @Get()
  findCurrent(@Tenant() tenantId: string) {
    return this.tenantsService.findById(tenantId);
  }

  @Patch('settings')
  @Roles('OWNER')
  updateSettings(
    @Tenant() tenantId: string,
    @Body() dto: UpdateTenantSettingsDto,
  ) {
    return this.tenantsService.updateSettings(tenantId, dto);
  }
}
