import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
} from '../../../test/helpers/test.utils';

describe('VehiclesService', () => {
  let service: VehiclesService;
  let vehicleRepo: ReturnType<typeof createMockRepository>;
  let workOrderRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    vehicleRepo = createMockRepository();
    workOrderRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VehiclesService,
        { provide: getRepositoryToken(Vehicle), useValue: vehicleRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: workOrderRepo },
      ],
    }).compile();

    service = module.get<VehiclesService>(VehiclesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create a vehicle with tenantId', async () => {
      const dto = { brand: 'Toyota', model: 'Corolla', plate: 'ABCD-12', year: 2023, clientId: 'c1' };
      const expected = { id: 'v1', tenantId, ...dto };
      vehicleRepo.create.mockReturnValue(expected);
      vehicleRepo.save.mockResolvedValue(expected);

      const result = await service.create(tenantId, dto as any);

      expect(vehicleRepo.create).toHaveBeenCalledWith({ tenantId, ...dto });
      expect(result.brand).toBe('Toyota');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('should return vehicle when found', async () => {
      const vehicle = { id: 'v1', tenantId, brand: 'Toyota' };
      vehicleRepo.findOne.mockResolvedValue(vehicle);

      const result = await service.findById(tenantId, 'v1');

      expect(result).toEqual(vehicle);
    });

    it('should throw NotFoundException when not found', async () => {
      vehicleRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findAll
  // ═══════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return vehicles with default ordering', async () => {
      const qb = createMockQueryBuilder();
      vehicleRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }]);

      const result = await service.findAll(tenantId, {} as any);

      expect(result).toHaveLength(2);
      expect(qb.orderBy).toHaveBeenCalledWith('vehicle.createdAt', 'DESC');
    });

    it('should apply search filter', async () => {
      const qb = createMockQueryBuilder();
      vehicleRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { search: 'Toyota' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%Toyota%' },
      );
    });

    it('should filter by clientId', async () => {
      const qb = createMockQueryBuilder();
      vehicleRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { clientId: 'c1' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('vehicle.clientId = :clientId', {
        clientId: 'c1',
      });
    });

    it('should filter by plate', async () => {
      const qb = createMockQueryBuilder();
      vehicleRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { plate: 'ABCD' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('vehicle.plate ILIKE :plate', {
        plate: '%ABCD%',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findByIdWithHistory
  // ═══════════════════════════════════════════════════════════════════

  describe('findByIdWithHistory', () => {
    it('should return vehicle with service history', async () => {
      const vehicle = { id: 'v1', tenantId };
      vehicleRepo.findOne.mockResolvedValue(vehicle);
      workOrderRepo.find.mockResolvedValue([{ id: 'wo1' }]);

      const result = await service.findByIdWithHistory(tenantId, 'v1');

      expect(result.vehicle).toEqual(vehicle);
      expect(result.workOrders).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  update
  // ═══════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update vehicle fields', async () => {
      const vehicle = { id: 'v1', tenantId, brand: 'Toyota', model: 'Corolla' };
      vehicleRepo.findOne.mockResolvedValue(vehicle);
      vehicleRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.update(tenantId, 'v1', { model: 'Camry' } as any);

      expect(result.model).toBe('Camry');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  remove
  // ═══════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove the vehicle', async () => {
      const vehicle = { id: 'v1', tenantId };
      vehicleRepo.findOne.mockResolvedValue(vehicle);
      vehicleRepo.remove.mockResolvedValue(vehicle);

      await service.remove(tenantId, 'v1');

      expect(vehicleRepo.remove).toHaveBeenCalledWith(vehicle);
    });

    it('should throw NotFoundException if vehicle does not exist', async () => {
      vehicleRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
