import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QuotationsService } from './quotations.service';
import { Quotation } from '../../database/entities/quotation.entity';
import { WorkOrder } from '../../database/entities/work-order.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
  createMockDataSource,
} from '../../../test/helpers/test.utils';

function createQuotation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    tenantId: 'tenant-123',
    quoteNumber: 1001,
    clientId: 'client-1',
    vehicleId: 'vehicle-1',
    createdBy: 'user-1',
    status: 'draft',
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    validUntil: null,
    notes: null,
    workOrderId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('QuotationsService', () => {
  let service: QuotationsService;
  let quoteRepo: ReturnType<typeof createMockRepository>;
  let woRepo: ReturnType<typeof createMockRepository>;
  let dataSource: ReturnType<typeof createMockDataSource>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    quoteRepo = createMockRepository();
    woRepo = createMockRepository();
    dataSource = createMockDataSource();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: getRepositoryToken(Quotation), useValue: quoteRepo },
        { provide: getRepositoryToken(WorkOrder), useValue: woRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════════

  describe('create', () => {
    it('should create a quotation with calculated totals', async () => {
      const dto = {
        clientId: 'client-1',
        vehicleId: 'vehicle-1',
        items: [
          { description: 'Labor', quantity: 2, unitPrice: 10000 },
          { description: 'Part', quantity: 1, unitPrice: 5000 },
        ],
        tax: 4750,
      };
      quoteRepo.create.mockImplementation((data: any) => ({ id: 'q1', ...data }));
      quoteRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.create(tenantId, 'user-1', dto as any);

      expect(quoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          status: 'draft',
          subtotal: 25000,
          tax: 4750,
          total: 29750,
        }),
      );
      expect(result.id).toBe('q1');
    });

    it('should default tax to 0 if not provided', async () => {
      const dto = {
        clientId: 'c1',
        vehicleId: 'v1',
        items: [{ description: 'X', quantity: 1, unitPrice: 1000 }],
      };
      quoteRepo.create.mockImplementation((data: any) => ({ id: 'q1', ...data }));
      quoteRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      await service.create(tenantId, 'user-1', dto as any);

      expect(quoteRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tax: 0, total: 1000 }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('should return quotation when found', async () => {
      const quote = createQuotation();
      quoteRepo.findOne.mockResolvedValue(quote);

      const result = await service.findById(tenantId, 'q1');

      expect(result).toEqual(quote);
    });

    it('should throw NotFoundException when not found', async () => {
      quoteRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  update
  // ═══════════════════════════════════════════════════════════════════

  describe('update', () => {
    it('should allow update when status is draft', async () => {
      const quote = createQuotation({ status: 'draft', subtotal: 1000, tax: 190 });
      quoteRepo.findOne.mockResolvedValue(quote);
      quoteRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.update(tenantId, 'q1', { notes: 'Updated' } as any);

      expect(result.notes).toBe('Updated');
    });

    it('should recalculate totals when items are updated', async () => {
      const quote = createQuotation({ status: 'draft', subtotal: 0, tax: 0 });
      quoteRepo.findOne.mockResolvedValue(quote);
      quoteRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.update(tenantId, 'q1', {
        items: [{ description: 'New', quantity: 3, unitPrice: 5000 }],
      } as any);

      expect(result.subtotal).toBe(15000);
      expect(result.total).toBe(15000);
    });

    it('should reject update when status is not draft', async () => {
      const quote = createQuotation({ status: 'sent' });
      quoteRepo.findOne.mockResolvedValue(quote);

      await expect(
        service.update(tenantId, 'q1', { notes: 'X' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  updateStatus — State Machine
  // ═══════════════════════════════════════════════════════════════════

  describe('updateStatus', () => {
    const validTransitions = [
      { from: 'draft', to: 'sent' },
      { from: 'sent', to: 'approved' },
      { from: 'sent', to: 'rejected' },
      { from: 'approved', to: 'converted' },
    ];

    it.each(validTransitions)(
      'should allow transition from $from to $to',
      async ({ from, to }) => {
        const quote = createQuotation({ status: from });
        quoteRepo.findOne.mockResolvedValue(quote);
        quoteRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

        const result = await service.updateStatus(tenantId, 'q1', { status: to } as any);

        expect(result.status).toBe(to);
      },
    );

    const invalidTransitions = [
      { from: 'draft', to: 'approved' },
      { from: 'draft', to: 'converted' },
      { from: 'sent', to: 'draft' },
      { from: 'converted', to: 'draft' },
      { from: 'rejected', to: 'sent' },
    ];

    it.each(invalidTransitions)(
      'should reject transition from $from to $to',
      async ({ from, to }) => {
        const quote = createQuotation({ status: from });
        quoteRepo.findOne.mockResolvedValue(quote);

        await expect(
          service.updateStatus(tenantId, 'q1', { status: to } as any),
        ).rejects.toThrow(BadRequestException);
      },
    );
  });

  // ═══════════════════════════════════════════════════════════════════
  //  convertToWorkOrder
  // ═══════════════════════════════════════════════════════════════════

  describe('convertToWorkOrder', () => {
    it('should reject if quotation is not approved', async () => {
      const quote = createQuotation({ status: 'draft' });
      quoteRepo.findOne.mockResolvedValue(quote);

      await expect(service.convertToWorkOrder(tenantId, 'q1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findAll
  // ═══════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return quotations with default ordering', async () => {
      const qb = createMockQueryBuilder();
      quoteRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([createQuotation()]);

      const result = await service.findAll(tenantId, {} as any);

      expect(result).toHaveLength(1);
      expect(qb.orderBy).toHaveBeenCalledWith('q.createdAt', 'DESC');
    });

    it('should filter by status', async () => {
      const qb = createMockQueryBuilder();
      quoteRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { status: 'sent' } as any);

      expect(qb.andWhere).toHaveBeenCalledWith('q.status = :status', { status: 'sent' });
    });
  });
});
