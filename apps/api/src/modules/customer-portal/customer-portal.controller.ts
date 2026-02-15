import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CustomerPortalService } from './customer-portal.service';
import { CustomerPortalGuard } from '../../common/guards/customer-portal.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Tenant, CurrentUser, Roles } from '../../common/decorators';
import {
  CreateCustomerAccessDto,
  CustomerLoginDto,
  CreateTicketDto,
  SendMessageDto,
  RequestReportDto,
  StaffReplyDto,
  UpdateTicketStatusDto,
} from './customer-portal.dto';

// ============================================================================
// A) Internal endpoints — for TORQUE staff (AuthGuard + RolesGuard)
// ============================================================================

@Controller('customer-portal')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CustomerPortalInternalController {
  constructor(private portalService: CustomerPortalService) {}

  // ── Access Management ──

  @Post('access')
  @Roles('OPERATOR')
  createAccess(
    @Tenant() tenantId: string,
    @Body() dto: CreateCustomerAccessDto,
  ) {
    return this.portalService.createAccess(tenantId, dto);
  }

  @Get('access')
  @Roles('OPERATOR')
  listAccesses(@Tenant() tenantId: string) {
    return this.portalService.listAccesses(tenantId);
  }

  @Delete('access/:id')
  @Roles('OPERATOR')
  deactivateAccess(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.portalService.deactivateAccess(tenantId, id);
  }

  @Post('access/:id/regenerate')
  @Roles('OPERATOR')
  regeneratePin(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.portalService.regeneratePin(tenantId, id);
  }

  // ── Tickets Management ──

  @Get('tickets')
  @Roles('OPERATOR')
  getTickets(
    @Tenant() tenantId: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('priority') priority?: string,
  ) {
    return this.portalService.staffGetAllTickets(tenantId, {
      status,
      category,
      priority,
    });
  }

  @Get('tickets/unread-count')
  @Roles('OPERATOR')
  getUnreadCount(@Tenant() tenantId: string) {
    return this.portalService.staffGetUnreadCount(tenantId);
  }

  @Get('tickets/:id/messages')
  @Roles('OPERATOR')
  getTicketMessages(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.portalService.staffGetTicketMessages(tenantId, id);
  }

  @Post('tickets/:id/reply')
  @Roles('OPERATOR')
  replyTicket(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('firstName') firstName: string,
    @CurrentUser('lastName') lastName: string,
    @Body() dto: StaffReplyDto,
  ) {
    const userName = `${firstName || ''} ${lastName || ''}`.trim() || 'Staff';
    return this.portalService.staffReplyTicket(tenantId, id, userId, userName, dto);
  }

  @Patch('tickets/:id/status')
  @Roles('OPERATOR')
  updateTicketStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.portalService.staffUpdateTicketStatus(tenantId, id, dto);
  }
}

// ============================================================================
// B) Public endpoints — for clients (CustomerPortalGuard)
// ============================================================================

@Controller('portal')
export class CustomerPortalPublicController {
  constructor(private portalService: CustomerPortalService) {}

  // ── Authentication (no guard needed) ──

  @Post('login')
  login(@Body() dto: CustomerLoginDto) {
    return this.portalService.validateAccess(dto);
  }

  // ── Protected portal endpoints ──

  @Get('dashboard')
  @UseGuards(CustomerPortalGuard)
  getDashboard(@Req() req: any) {
    return this.portalService.getClientDashboard(
      req.portalClient.tenantId,
      req.portalClient.clientId,
    );
  }

  @Get('work-orders/:id')
  @UseGuards(CustomerPortalGuard)
  getWorkOrderProgress(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getWorkOrderProgress(
      req.portalClient.tenantId,
      req.portalClient.clientId,
      id,
    );
  }

  @Post('tickets')
  @UseGuards(CustomerPortalGuard)
  createTicket(@Req() req: any, @Body() dto: CreateTicketDto) {
    return this.portalService.createTicket(
      req.portalClient.tenantId,
      req.portalClient.clientId,
      dto,
    );
  }

  @Get('tickets')
  @UseGuards(CustomerPortalGuard)
  getTickets(@Req() req: any) {
    return this.portalService.getTickets(
      req.portalClient.tenantId,
      req.portalClient.clientId,
    );
  }

  @Get('tickets/:id/messages')
  @UseGuards(CustomerPortalGuard)
  getTicketMessages(@Req() req: any, @Param('id') id: string) {
    return this.portalService.getTicketMessages(
      req.portalClient.tenantId,
      id,
      req.portalClient.clientId,
    );
  }

  @Post('tickets/:id/messages')
  @UseGuards(CustomerPortalGuard)
  sendMessage(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.portalService.addMessage(
      req.portalClient.tenantId,
      id,
      req.portalClient.clientId,
      dto,
    );
  }

  @Post('tickets/:id/mark-read')
  @UseGuards(CustomerPortalGuard)
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.portalService.markMessagesRead(
      req.portalClient.tenantId,
      id,
      req.portalClient.clientId,
    );
  }

  @Post('request-report')
  @UseGuards(CustomerPortalGuard)
  requestReport(@Req() req: any, @Body() dto: RequestReportDto) {
    return this.portalService.requestPaidReport(
      req.portalClient.tenantId,
      req.portalClient.clientId,
      dto,
    );
  }
}
