import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkOrdersService } from './work-orders.service';
import {
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateStatusDto,
  AssignTechnicianDto,
  AddPartDto,
  ListWorkOrdersQueryDto,
  OrderFiltersDto,
} from './work-orders.dto';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('work-orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('OPERATOR')
export class WorkOrdersController {
  constructor(private workOrdersService: WorkOrdersService) {}

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateWorkOrderDto) {
    return this.workOrdersService.create(tenantId, dto);
  }

  // ── Stats endpoint (must be before :id to avoid route conflict) ──
  @Get('stats')
  getStats(@Tenant() tenantId: string) {
    return this.workOrdersService.getOpenOrderStats(tenantId);
  }

  // ── Aging report ──
  @Get('aging')
  getAgingReport(@Tenant() tenantId: string) {
    return this.workOrdersService.getAgingReport(tenantId);
  }

  // ── Overdue shortcut ──
  @Get('overdue')
  getOverdue(@Tenant() tenantId: string) {
    return this.workOrdersService.findAllFiltered(tenantId, {
      isOverdue: true,
      sortBy: 'dueDate',
      sortOrder: 'ASC',
    });
  }

  // ── Enhanced filtered list with pagination ──
  @Get('filtered')
  findAllFiltered(
    @Tenant() tenantId: string,
    @Query() filters: OrderFiltersDto,
  ) {
    return this.workOrdersService.findAllFiltered(tenantId, filters);
  }

  // ── Legacy list (backwards compatible) ──
  @Get()
  findAll(
    @Tenant() tenantId: string,
    @Query() query: ListWorkOrdersQueryDto,
  ) {
    return this.workOrdersService.findAll(tenantId, query);
  }

  @Get(':id')
  findById(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.workOrdersService.findById(tenantId, id);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.workOrdersService.update(tenantId, id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.workOrdersService.updateStatus(tenantId, id, dto);
  }

  @Patch(':id/assign')
  assignTechnician(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AssignTechnicianDto,
  ) {
    return this.workOrdersService.assignTechnician(tenantId, id, dto);
  }

  @Post(':id/parts')
  addPart(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AddPartDto,
  ) {
    return this.workOrdersService.addPart(tenantId, id, dto);
  }

  @Delete(':id/parts/:partId')
  removePart(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('partId') partId: string,
  ) {
    return this.workOrdersService.removePart(tenantId, id, partId);
  }
}
