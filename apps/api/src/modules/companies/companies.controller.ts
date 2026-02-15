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
import { CompaniesService } from './companies.service';
import { Tenant, CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  CreateContactDto,
  UpdateContactDto,
  LinkClientDto,
} from './companies.dto';

@Controller('companies')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  // ─── Companies ───────────────────────────────────────────────

  @Post()
  @Roles('MANAGER')
  create(
    @Tenant() tenantId: string,
    @Body() dto: CreateCompanyDto,
  ) {
    return this.companiesService.create(tenantId, dto);
  }

  @Get()
  @Roles('OPERATOR')
  findAll(
    @Tenant() tenantId: string,
    @Query('industry') industry?: string,
    @Query('search') search?: string,
  ) {
    return this.companiesService.findAll(tenantId, { industry, search });
  }

  @Get(':id')
  @Roles('OPERATOR')
  findOne(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.companiesService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('MANAGER')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(tenantId, id, dto);
  }

  // ─── Contacts ────────────────────────────────────────────────

  @Post(':id/contacts')
  @Roles('MANAGER')
  addContact(
    @Tenant() tenantId: string,
    @Param('id') companyId: string,
    @Body() dto: CreateContactDto,
  ) {
    return this.companiesService.addContact(tenantId, companyId, dto);
  }

  @Get(':id/contacts')
  @Roles('OPERATOR')
  getContacts(
    @Tenant() tenantId: string,
    @Param('id') companyId: string,
  ) {
    return this.companiesService.getContacts(tenantId, companyId);
  }

  @Patch('contacts/:contactId')
  @Roles('MANAGER')
  updateContact(
    @Tenant() tenantId: string,
    @Param('contactId') contactId: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.companiesService.updateContact(tenantId, contactId, dto);
  }

  @Delete('contacts/:contactId')
  @Roles('ADMIN')
  removeContact(
    @Tenant() tenantId: string,
    @Param('contactId') contactId: string,
  ) {
    return this.companiesService.removeContact(tenantId, contactId);
  }

  // ─── Subsidiaries & Linking ──────────────────────────────────

  @Get(':id/subsidiaries')
  @Roles('MANAGER')
  getSubsidiaries(
    @Tenant() tenantId: string,
    @Param('id') parentId: string,
  ) {
    return this.companiesService.getSubsidiaries(tenantId, parentId);
  }

  @Post(':id/link-client')
  @Roles('MANAGER')
  linkClient(
    @Tenant() tenantId: string,
    @Param('id') companyId: string,
    @Body() dto: LinkClientDto,
  ) {
    return this.companiesService.linkClient(tenantId, companyId, dto.clientId);
  }
}
