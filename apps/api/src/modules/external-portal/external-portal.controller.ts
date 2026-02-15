import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ExternalPortalService } from './external-portal.service';
import { ExternalTokenGuard } from '../../common/guards/external-token.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Tenant, CurrentUser, Roles } from '../../common/decorators';
import {
  CreateExternalAccessDto,
  UpdateImportFieldsDto,
  UpdateImportStatusDto,
  AddDocumentDto,
  AddNoteDto,
} from './external-portal.dto';

// ============================================================================
// A) Internal endpoints — for TORQUE users (AuthGuard + RolesGuard)
// ============================================================================

@Controller('external-portal/access')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ExternalPortalInternalController {
  constructor(private portalService: ExternalPortalService) {}

  @Post()
  @Roles('ADMIN')
  createAccess(
    @Tenant() tenantId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateExternalAccessDto,
  ) {
    return this.portalService.createAccess(tenantId, userId, dto);
  }

  @Get('import/:importOrderId')
  @Roles('MANAGER')
  listAccessByImportOrder(
    @Tenant() tenantId: string,
    @Param('importOrderId') importOrderId: string,
  ) {
    return this.portalService.listAccessByImportOrder(tenantId, importOrderId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  revokeAccess(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.portalService.revokeAccess(tenantId, id);
  }

  @Post(':id/regenerate')
  @Roles('ADMIN')
  regenerateToken(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.portalService.regenerateToken(tenantId, id);
  }

  @Get('log/:importOrderId')
  @Roles('MANAGER')
  getUpdateLog(
    @Tenant() tenantId: string,
    @Param('importOrderId') importOrderId: string,
  ) {
    return this.portalService.getUpdateLog(tenantId, importOrderId);
  }

  @Get('activity/:importOrderId')
  @Roles('MANAGER')
  getAgentActivity(
    @Tenant() tenantId: string,
    @Param('importOrderId') importOrderId: string,
  ) {
    return this.portalService.getAgentActivity(tenantId, importOrderId);
  }
}

// ============================================================================
// B) External endpoints — for external agents (ExternalTokenGuard)
// ============================================================================

@Controller('external-portal/my-import')
@UseGuards(ExternalTokenGuard)
export class ExternalPortalAgentController {
  constructor(private portalService: ExternalPortalService) {}

  @Get()
  getMyImport(@Req() req: any) {
    return this.portalService.getImportForAgent(req.externalAgent);
  }

  @Patch('status')
  updateStatus(
    @Req() req: any,
    @Body() dto: UpdateImportStatusDto,
  ) {
    return this.portalService.updateStatusByAgent(
      req.externalAgent,
      dto,
      req.clientIp || req.ip,
    );
  }

  @Patch('fields')
  updateFields(
    @Req() req: any,
    @Body() dto: UpdateImportFieldsDto,
  ) {
    return this.portalService.updateImportByAgent(
      req.externalAgent,
      dto,
      req.clientIp || req.ip,
    );
  }

  @Post('documents')
  uploadDocument(
    @Req() req: any,
    @Body() dto: AddDocumentDto,
  ) {
    return this.portalService.uploadDocumentByAgent(
      req.externalAgent,
      dto,
      req.clientIp || req.ip,
    );
  }

  @Post('notes')
  addNote(
    @Req() req: any,
    @Body() dto: AddNoteDto,
  ) {
    return this.portalService.addNoteByAgent(
      req.externalAgent,
      dto,
      req.clientIp || req.ip,
    );
  }

  @Get('log')
  getLog(@Req() req: any) {
    return this.portalService.getLogForAgent(req.externalAgent);
  }
}
