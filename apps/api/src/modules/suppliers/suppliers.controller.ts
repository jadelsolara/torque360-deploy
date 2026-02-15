import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuppliersService } from './suppliers.service';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { CreateSupplierDto, UpdateSupplierDto, UpdateRatingDto } from './suppliers.dto';

@Controller('suppliers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SuppliersController {
  constructor(private suppliersService: SuppliersService) {}

  @Post()
  @Roles('MANAGER')
  create(
    @Tenant() tenantId: string,
    @Body() dto: CreateSupplierDto,
  ) {
    return this.suppliersService.create(tenantId, dto);
  }

  @Get()
  @Roles('OPERATOR')
  findAll(
    @Tenant() tenantId: string,
    @Query('country') country?: string,
    @Query('search') search?: string,
    @Query('minRating') minRating?: string,
  ) {
    return this.suppliersService.findAll(tenantId, {
      country,
      search,
      minRating: minRating ? parseFloat(minRating) : undefined,
    });
  }

  @Get('top')
  @Roles('MANAGER')
  getTopSuppliers(
    @Tenant() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.suppliersService.getTopSuppliers(
      tenantId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Get(':id')
  @Roles('OPERATOR')
  findOne(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Roles('MANAGER')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ) {
    return this.suppliersService.update(tenantId, id, dto);
  }

  @Patch(':id/rating')
  @Roles('MANAGER')
  updateRating(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRatingDto,
  ) {
    return this.suppliersService.updateRating(tenantId, id, dto.rating);
  }

  @Delete(':id')
  @Roles('ADMIN')
  deactivate(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.suppliersService.deactivate(tenantId, id);
  }
}
