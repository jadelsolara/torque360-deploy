import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Tenant, Roles } from '../../common/decorators';
import { Company360Service } from './company360.service';

@Controller('company360')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class Company360Controller {
  constructor(private readonly service: Company360Service) {}

  @Get()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getOverview(@Tenant() tenantId: string) {
    return this.service.getCompany360(tenantId);
  }

  @Get('financial-summary')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getFinancialSummary(
    @Tenant() tenantId: string,
    @Query('year') year: string,
  ) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.service.getFinancialSummary(tenantId, y);
  }

  @Get('operational-kpis')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getOperationalKPIs(
    @Tenant() tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.service.getOperationalKPIs(tenantId, dateFrom, dateTo);
  }

  @Get('alerts')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getAlerts(@Tenant() tenantId: string) {
    return this.service.getAlerts(tenantId);
  }

  @Get('trends')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  getTrends(
    @Tenant() tenantId: string,
    @Query('months') months: string,
  ) {
    const m = months === '12' ? 12 : 6;
    return this.service.getTrends(tenantId, m);
  }
}
