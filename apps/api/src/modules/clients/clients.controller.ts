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
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ListClientsQueryDto,
} from './clients.dto';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('clients')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('OPERATOR')
export class ClientsController {
  constructor(private clientsService: ClientsService) {}

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateClientDto) {
    return this.clientsService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @Tenant() tenantId: string,
    @Query() query: ListClientsQueryDto,
  ) {
    return this.clientsService.findAll(tenantId, query);
  }

  @Get(':id')
  findById(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.clientsService.findById(tenantId, id);
  }

  @Get(':id/details')
  findWithDetails(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.clientsService.findByIdWithDetails(tenantId, id);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.clientsService.remove(tenantId, id);
  }
}
