import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateUserDto, DeactivateUserDto, ListUsersQueryDto } from './users.dto';
import { Tenant, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Tenant() tenantId: string, @Query() query: ListUsersQueryDto) {
    return this.usersService.findAll(tenantId, query);
  }

  @Get(':id')
  findById(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.usersService.findById(tenantId, id);
  }

  @Patch(':id')
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(tenantId, id, dto);
  }

  @Patch(':id/status')
  deactivate(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: DeactivateUserDto,
  ) {
    return this.usersService.deactivate(tenantId, id, dto);
  }
}
