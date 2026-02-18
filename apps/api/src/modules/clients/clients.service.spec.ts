import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client } from '../../database/entities/client.entity';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
} from '../../../test/helpers/test.utils';

describe('ClientsService', () => {
  let service: ClientsService;
  let clientRepo: ReturnType<typeof createMockRepository>;
  let vehicleRepo: ReturnType<typeof createMockRepository>;
  let workOrderRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    clientRepo = createMockRepository();
    vehicleRepo = createMockRepository();
    workOrderRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getRepositoryToken(Client), useValue: clientRepo },
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: workOrderRepo },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create a client with tenantId', async () => {
      const dto = { firstName: 'Juan', lastName: 'Perez', email: 'juan@test.cl' };
      const expected = { id: 'c1', tenantId, ...dto };
      clientRepo.create.mockReturnValue(expected);
      clientRepo.save.mockResolvedValue(expected);

      const result = await service.create(tenantId, dto as any);

      expect(clientRepo.create).toHaveBeenCalledWith({ tenantId, ...dto });
      expect(result.tenantId).toBe(tenantId);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('should return client when found', async () => {
      const client = { id: 'c1', tenantId, firstName: 'Juan' };
      clientRepo.findOne.mockResolvedValue(client);

      const result = await service.findById(tenantId, 'c1');

      expect(result).toEqual(client);
      expect(clientRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'c1', tenantId },
      });
    });

    it('should throw NotFoundException when not found', async () => {
      clientRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findAll
  // ═══════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return clients with default ordering', async () => {
      const qb = createMockQueryBuilder();
      clientRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([{ id: 'c1' }]);

      const result = await service.findAll(tenantId, {} as any);

      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith('client.tenantId = :tenantId', { tenantId });
      expect(qb.orderBy).toHaveBeenCalledWith('client.createdAt', 'DESC');
    });

    it('should apply search filter', async () => {
      const qb = createMockQueryBuilder();
      clientRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { search: 'Juan' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%Juan%' },
      );
    });

    it('should apply rut filter', async () => {
      const qb = createMockQueryBuilder();
      clientRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { rut: '12345' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('client.rut ILIKE :rut', {
        rut: '%12345%',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findByIdWithDetails
  // ═══════════════════════════════════════════════════════════════════

  describe('findByIdWithDetails', () => {
    it('should return client with vehicles and work orders', async () => {
      const client = { id: 'c1', tenantId };
      clientRepo.findOne.mockResolvedValue(client);
      vehicleRepo.find.mockResolvedValue([{ id: 'v1' }]);
      workOrderRepo.find.mockResolvedValue([{ id: 'wo1' }]);

      const result = await service.findByIdWithDetails(tenantId, 'c1');

      expect(result.client).toEqual(client);
      expect(result.vehicles).toHaveLength(1);
      expect(result.workOrders).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  update
  // ═══════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update and return the client', async () => {
      const client = { id: 'c1', tenantId, firstName: 'Juan' };
      clientRepo.findOne.mockResolvedValue(client);
      clientRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.update(tenantId, 'c1', { firstName: 'Carlos' } as any);

      expect(result.firstName).toBe('Carlos');
    });

    it('should throw NotFoundException if client does not exist', async () => {
      clientRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(tenantId, 'nonexistent', { firstName: 'X' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  remove
  // ═══════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove the client', async () => {
      const client = { id: 'c1', tenantId };
      clientRepo.findOne.mockResolvedValue(client);
      clientRepo.remove.mockResolvedValue(client);

      await service.remove(tenantId, 'c1');

      expect(clientRepo.remove).toHaveBeenCalledWith(client);
    });

    it('should throw NotFoundException if client does not exist', async () => {
      clientRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
