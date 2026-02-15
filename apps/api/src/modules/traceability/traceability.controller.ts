import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TraceabilityService } from './traceability.service';
import { RecordEventDto } from './traceability.dto';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('traceability')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class TraceabilityController {
  constructor(private traceabilityService: TraceabilityService) {}

  /**
   * Record a new traceability event in the hash chain.
   * OPERATOR+ required.
   */
  @Post('events')
  @Roles('OPERATOR')
  recordEvent(
    @Tenant() tenantId: string,
    @Body() dto: RecordEventDto,
  ) {
    return this.traceabilityService.recordEvent(tenantId, dto);
  }

  /**
   * Get the full traceability chain for a specific item.
   * OPERATOR+ required.
   */
  @Get('items/:itemId/chain')
  @Roles('OPERATOR')
  getItemChain(
    @Tenant() tenantId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.traceabilityService.getItemChain(tenantId, itemId);
  }

  /**
   * Verify the integrity of the hash chain for a specific item.
   * MANAGER+ required.
   */
  @Get('items/:itemId/verify')
  @Roles('MANAGER')
  verifyChain(
    @Tenant() tenantId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.traceabilityService.verifyChain(tenantId, itemId);
  }

  /**
   * Get all traceability entries for a lot number.
   * OPERATOR+ required.
   */
  @Get('lots/:lotNumber')
  @Roles('OPERATOR')
  getByLot(
    @Tenant() tenantId: string,
    @Param('lotNumber') lotNumber: string,
  ) {
    return this.traceabilityService.getByLot(tenantId, lotNumber);
  }

  /**
   * Get all traceability entries for a serial number.
   * OPERATOR+ required.
   */
  @Get('serials/:serialNumber')
  @Roles('OPERATOR')
  getBySerial(
    @Tenant() tenantId: string,
    @Param('serialNumber') serialNumber: string,
  ) {
    return this.traceabilityService.getBySerial(tenantId, serialNumber);
  }

  /**
   * Get entries linked to a specific reference (e.g., work order, import order).
   * OPERATOR+ required.
   */
  @Get('references/:referenceType/:referenceId')
  @Roles('OPERATOR')
  getByReference(
    @Tenant() tenantId: string,
    @Param('referenceType') referenceType: string,
    @Param('referenceId') referenceId: string,
  ) {
    return this.traceabilityService.getByReference(tenantId, referenceType, referenceId);
  }

  /**
   * Get all distinct event types used within this tenant.
   * VIEWER+ required.
   */
  @Get('event-types')
  @Roles('VIEWER')
  getEventTypes(@Tenant() tenantId: string) {
    return this.traceabilityService.getEventTypes(tenantId);
  }

  /**
   * Get recent traceability events across all items.
   * MANAGER+ required.
   */
  @Get('recent')
  @Roles('MANAGER')
  getRecentEvents(
    @Tenant() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    return this.traceabilityService.getRecentEvents(tenantId, parsedLimit);
  }
}
