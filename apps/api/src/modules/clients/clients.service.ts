import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../../database/entities/client.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import {
  CreateClientDto,
  UpdateClientDto,
  ListClientsQueryDto,
} from './clients.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(Vehicle) private vehicleRepo: Repository<Vehicle>,
    @InjectRepository(WorkOrder) private workOrderRepo: Repository<WorkOrder>,
  ) {}

  async create(tenantId: string, dto: CreateClientDto): Promise<Client> {
    const client = this.clientRepo.create({
      tenantId,
      ...dto,
    });
    return this.clientRepo.save(client);
  }

  async findAll(
    tenantId: string,
    query: ListClientsQueryDto,
  ): Promise<Client[]> {
    const qb = this.clientRepo
      .createQueryBuilder('client')
      .where('client.tenantId = :tenantId', { tenantId });

    if (query.search) {
      qb.andWhere(
        '(client.firstName ILIKE :search OR client.lastName ILIKE :search OR client.companyName ILIKE :search OR client.rut ILIKE :search OR client.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.name) {
      qb.andWhere(
        '(client.firstName ILIKE :name OR client.lastName ILIKE :name OR client.companyName ILIKE :name)',
        { name: `%${query.name}%` },
      );
    }

    if (query.rut) {
      qb.andWhere('client.rut ILIKE :rut', { rut: `%${query.rut}%` });
    }

    if (query.email) {
      qb.andWhere('client.email ILIKE :email', {
        email: `%${query.email}%`,
      });
    }

    qb.orderBy('client.createdAt', 'DESC');

    return qb.getMany();
  }

  async findById(tenantId: string, clientId: string): Promise<Client> {
    const client = await this.clientRepo.findOne({
      where: { id: clientId, tenantId },
    });
    if (!client) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async findByIdWithDetails(
    tenantId: string,
    clientId: string,
  ): Promise<{
    client: Client;
    vehicles: Vehicle[];
    workOrders: WorkOrder[];
  }> {
    const client = await this.findById(tenantId, clientId);

    const vehicles = await this.vehicleRepo.find({
      where: { clientId, tenantId },
      order: { createdAt: 'DESC' },
    });

    const workOrders = await this.workOrderRepo.find({
      where: { clientId, tenantId },
      order: { createdAt: 'DESC' },
      relations: ['vehicle', 'parts'],
    });

    return { client, vehicles, workOrders };
  }

  async update(
    tenantId: string,
    clientId: string,
    dto: UpdateClientDto,
  ): Promise<Client> {
    const client = await this.findById(tenantId, clientId);

    Object.assign(client, dto);

    return this.clientRepo.save(client);
  }

  async remove(tenantId: string, clientId: string): Promise<void> {
    const client = await this.findById(tenantId, clientId);
    await this.clientRepo.remove(client);
  }
}
