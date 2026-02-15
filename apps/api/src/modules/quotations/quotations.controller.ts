import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { QuotationsService } from './quotations.service';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
  UpdateQuotationStatusDto,
  ListQuotationsQueryDto,
  QuotationFiltersDto,
} from './quotations.dto';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('quotations')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('OPERATOR')
export class QuotationsController {
  constructor(private quotationsService: QuotationsService) {}

  @Post()
  create(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.quotationsService.create(tenantId, userId, dto);
  }

  // ── Stats endpoint (must be before :id to avoid route conflict) ──
  @Get('stats')
  getStats(@Tenant() tenantId: string) {
    return this.quotationsService.getOpenQuotationStats(tenantId);
  }

  // ── Enhanced filtered list with pagination ──
  @Get('filtered')
  findAllFiltered(
    @Tenant() tenantId: string,
    @Query() filters: QuotationFiltersDto,
  ) {
    return this.quotationsService.findAllFiltered(tenantId, filters);
  }

  // ── Legacy list (backwards compatible) ──
  @Get()
  findAll(
    @Tenant() tenantId: string,
    @Query() query: ListQuotationsQueryDto,
  ) {
    return this.quotationsService.findAll(tenantId, query);
  }

  @Get(':id')
  findById(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.quotationsService.findById(tenantId, id);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.quotationsService.update(tenantId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationStatusDto,
  ) {
    return this.quotationsService.updateStatus(tenantId, id, dto);
  }

  @Post(':id/convert')
  convertToWorkOrder(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.quotationsService.convertToWorkOrder(tenantId, id);
  }
}
