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
import { VehiclesService } from './vehicles.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  ListVehiclesQueryDto,
} from './vehicles.dto';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('vehicles')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('OPERATOR')
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  create(@Tenant() tenantId: string, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(tenantId, dto);
  }

  @Get()
  findAll(
    @Tenant() tenantId: string,
    @Query() query: ListVehiclesQueryDto,
  ) {
    return this.vehiclesService.findAll(tenantId, query);
  }

  @Get(':id')
  findById(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.vehiclesService.findById(tenantId, id);
  }

  @Get(':id/history')
  findWithHistory(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.vehiclesService.findByIdWithHistory(tenantId, id);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(tenantId, id, dto);
  }

  @Delete(':id')
  remove(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.vehiclesService.remove(tenantId, id);
  }
}
