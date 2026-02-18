import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { Supplier } from '../../database/entities/supplier.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
} from '../../../test/helpers/test.utils';

describe('SuppliersService', () => {
  let service: SuppliersService;
  let supplierRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    supplierRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuppliersService,
        { provide: getRepositoryToken(Supplier), useValue: supplierRepo },
      ],
    }).compile();

    service = module.get<SuppliersService>(SuppliersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════════

  describe('create', () => {
    const dto = {
      name: 'AutoParts SA',
      rut: '76.123.456-7',
      country: 'CL',
      contactName: 'Carlos',
      contactEmail: 'carlos@autoparts.cl',
    };

    it('should create a supplier', async () => {
      supplierRepo.findOne.mockResolvedValue(null);
      const expected = { id: 's1', tenantId, ...dto, currency: 'CLP' };
      supplierRepo.create.mockReturnValue(expected);
      supplierRepo.save.mockResolvedValue(expected);

      const result = await service.create(tenantId, dto as any);

      expect(result.name).toBe('AutoParts SA');
      expect(result.currency).toBe('CLP');
    });

    it('should throw ConflictException if RUT already exists', async () => {
      supplierRepo.findOne.mockResolvedValue({ id: 's-existing', rut: dto.rut });

      await expect(service.create(tenantId, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow creation without RUT', async () => {
      const dtoNoRut = { name: 'International Parts', country: 'US' };
      const expected = { id: 's2', tenantId, ...dtoNoRut, currency: 'CLP' };
      supplierRepo.create.mockReturnValue(expected);
      supplierRepo.save.mockResolvedValue(expected);

      const result = await service.create(tenantId, dtoNoRut as any);

      expect(supplierRepo.findOne).not.toHaveBeenCalled();
      expect(result.name).toBe('International Parts');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findOne
  // ═══════════════════════════════════════════════════════════════════

  describe('findOne', () => {
    it('should return supplier when found', async () => {
      const supplier = { id: 's1', tenantId, name: 'AutoParts' };
      supplierRepo.findOne.mockResolvedValue(supplier);

      const result = await service.findOne(tenantId, 's1');

      expect(result).toEqual(supplier);
    });

    it('should throw NotFoundException when not found', async () => {
      supplierRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  update
  // ═══════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should update supplier fields', async () => {
      const supplier = { id: 's1', tenantId, name: 'Old Name', rut: '1-1' };
      supplierRepo.findOne
        .mockResolvedValueOnce(supplier)   // findOne in update
        .mockResolvedValueOnce(null);      // RUT uniqueness check
      supplierRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.update(tenantId, 's1', { name: 'New Name', rut: '2-2' } as any);

      expect(result.name).toBe('New Name');
    });

    it('should throw ConflictException if new RUT belongs to another supplier', async () => {
      const supplier = { id: 's1', tenantId, name: 'Mine', rut: '1-1' };
      supplierRepo.findOne
        .mockResolvedValueOnce(supplier)
        .mockResolvedValueOnce({ id: 's-other', rut: '2-2' }); // another supplier has this RUT

      await expect(
        service.update(tenantId, 's1', { rut: '2-2' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  deactivate
  // ═══════════════════════════════════════════════════════════════════

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const supplier = { id: 's1', tenantId, isActive: true };
      supplierRepo.findOne.mockResolvedValue(supplier);
      supplierRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.deactivate(tenantId, 's1');

      expect(result.isActive).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  updateRating
  // ═══════════════════════════════════════════════════════════════════

  describe('updateRating', () => {
    it('should update the supplier rating', async () => {
      const supplier = { id: 's1', tenantId, rating: 3 };
      supplierRepo.findOne.mockResolvedValue(supplier);
      supplierRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.updateRating(tenantId, 's1', 5);

      expect(result.rating).toBe(5);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getTopSuppliers
  // ═══════════════════════════════════════════════════════════════════

  describe('getTopSuppliers', () => {
    it('should return top-rated active suppliers', async () => {
      supplierRepo.find.mockResolvedValue([{ id: 's1', rating: 5 }]);

      const result = await service.getTopSuppliers(tenantId, 5);

      expect(result).toHaveLength(1);
      expect(supplierRepo.find).toHaveBeenCalledWith({
        where: { tenantId, isActive: true },
        order: { rating: 'DESC' },
        take: 5,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findAll
  // ═══════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return suppliers ordered by name', async () => {
      const qb = createMockQueryBuilder();
      supplierRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([{ id: 's1' }]);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(1);
      expect(qb.orderBy).toHaveBeenCalledWith('s.name', 'ASC');
    });

    it('should filter by country', async () => {
      const qb = createMockQueryBuilder();
      supplierRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { country: 'CL' });

      expect(qb.andWhere).toHaveBeenCalledWith('s.country = :country', { country: 'CL' });
    });

    it('should apply search filter', async () => {
      const qb = createMockQueryBuilder();
      supplierRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { search: 'Auto' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%Auto%' },
      );
    });
  });
});
