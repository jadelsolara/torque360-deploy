import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { UpdateUserDto, DeactivateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async findAll(
    tenantId: string,
    query: { search?: string; role?: string; isActive?: string },
  ): Promise<User[]> {
    const qb = this.userRepo
      .createQueryBuilder('user')
      .where('user.tenantId = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere(
        '(user.firstName ILIKE :search OR user.lastName ILIKE :search OR user.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.role) {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      qb.andWhere('user.isActive = :isActive', {
        isActive: query.isActive === 'true',
      });
    }

    qb.orderBy('user.createdAt', 'DESC');

    return qb.getMany();
  }

  async findById(tenantId: string, userId: string): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async update(
    tenantId: string,
    userId: string,
    dto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.findById(tenantId, userId);

    if (user.role === 'OWNER') {
      throw new ForbiddenException('Cannot modify OWNER user via this endpoint');
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName;
    if (dto.lastName !== undefined) user.lastName = dto.lastName;
    if (dto.email !== undefined) user.email = dto.email;
    if (dto.role !== undefined) user.role = dto.role;

    return this.userRepo.save(user);
  }

  async deactivate(
    tenantId: string,
    userId: string,
    dto: DeactivateUserDto,
  ): Promise<User> {
    const user = await this.findById(tenantId, userId);

    if (user.role === 'OWNER') {
      throw new ForbiddenException('Cannot deactivate OWNER user');
    }

    user.isActive = dto.isActive;
    return this.userRepo.save(user);
  }
}
