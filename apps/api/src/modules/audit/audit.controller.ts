import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from './audit.service';
import { ListAuditLogsQueryDto } from './audit.dto';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('audit')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get()
  findAll(
    @Tenant() tenantId: string,
    @Query() query: ListAuditLogsQueryDto,
  ) {
    return this.auditService.findAll(tenantId, query);
  }

  @Get('verify')
  verifyChain(@Tenant() tenantId: string) {
    return this.auditService.verifyChain(tenantId);
  }
}
