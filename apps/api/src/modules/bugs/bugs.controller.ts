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
import { BugsService } from './bugs.service';
import { Tenant, Roles, CurrentUser } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { CreateBugReportDto, UpdateBugStatusDto, BugFiltersDto } from './bugs.dto';

@Controller('bugs')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class BugsController {
  constructor(private bugsService: BugsService) {}

  @Post()
  @Roles('OPERATOR')
  create(
    @Tenant() tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBugReportDto,
  ) {
    return this.bugsService.create(tenantId, dto, userId);
  }

  @Get()
  @Roles('MANAGER')
  findAll(
    @Tenant() tenantId: string,
    @Query('status') status?: string,
    @Query('severity') severity?: string,
    @Query('search') search?: string,
    @Query('section') section?: string,
  ) {
    return this.bugsService.findAll(tenantId, {
      status,
      severity,
      search,
      section,
    });
  }

  @Get('stats')
  @Roles('MANAGER')
  getStats(@Tenant() tenantId: string) {
    return this.bugsService.getStats(tenantId);
  }

  @Get(':id')
  @Roles('MANAGER')
  findById(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.bugsService.findById(tenantId, id);
  }

  @Patch(':id/status')
  @Roles('MANAGER')
  updateStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBugStatusDto,
  ) {
    return this.bugsService.updateStatus(tenantId, id, dto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.bugsService.remove(tenantId, id);
  }
}
