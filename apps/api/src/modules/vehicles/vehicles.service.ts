import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  ListVehiclesQueryDto,
} from './vehicles.dto';

@Injectable()
export class VehiclesService {
  constructor(
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(WorkOrder) private workOrderRepo: Repository<WorkOrder>,
  ) {}

  async create(tenantId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const vehicle = this.vehicleRepo.create({
      tenantId,
      ...dto,
    });
    return this.vehicleRepo.save(vehicle);
  }

  async findAll(
    tenantId: string,
    query: ListVehiclesQueryDto,
  ): Promise<Vehicle[]> {
    const qb = this.vehicleRepo
      .createQueryBuilder('vehicle')
      .where('vehicle.tenantId = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere(
        '(vehicle.brand ILIKE :search OR vehicle.model ILIKE :search OR vehicle.plate ILIKE :search OR vehicle.vin ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.brand) {
      qb.andWhere('vehicle.brand ILIKE :brand', {
        brand: `%${query.brand}%`,
      });
    }

    if (query.model) {
      qb.andWhere('vehicle.model ILIKE :model', {
        model: `%${query.model}%`,
      });
    }

    if (query.plate) {
      qb.andWhere('vehicle.plate ILIKE :plate', {
        plate: `%${query.plate}%`,
      });
    }

    if (query.vin) {
      qb.andWhere('vehicle.vin ILIKE :vin', { vin: `%${query.vin}%` });
    }

    if (query.clientId) {
      qb.andWhere('vehicle.clientId = :clientId', {
        clientId: query.clientId,
      });
    }

    qb.orderBy('vehicle.createdAt', 'DESC');

    return qb.getMany();
  }

  async findById(tenantId: string, vehicleId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepo.findOne({
      where: { id: vehicleId, tenantId },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }
    return vehicle;
  }

  async findByIdWithHistory(
    tenantId: string,
    vehicleId: string,
  ): Promise<{ vehicle: Vehicle; workOrders: WorkOrder[] }> {
    const vehicle = await this.findById(tenantId, vehicleId);

    const workOrders = await this.workOrderRepo.find({
      where: { vehicleId, tenantId },
      order: { createdAt: 'DESC' },
      relations: ['parts'],
    });

    return { vehicle, workOrders };
  }

  async update(
    tenantId: string,
    vehicleId: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    const vehicle = await this.findById(tenantId, vehicleId);

    Object.assign(vehicle, dto);

    return this.vehicleRepo.save(vehicle);
  }

  async remove(tenantId: string, vehicleId: string): Promise<void> {
    const vehicle = await this.findById(tenantId, vehicleId);
    await this.vehicleRepo.remove(vehicle);
  }
}
