import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BugsService } from './bugs.service';
import { BugReport } from '../../database/entities/bug-report.entity';
import {
  createMockRepository,
  createMockQueryBuilder,
} from '../../../test/helpers/test.utils';

describe('BugsService', () => {
  let service: BugsService;
  let bugRepo: ReturnType<typeof createMockRepository>;

  const tenantId = 'tenant-123';

  beforeEach(async () => {
    bugRepo = createMockRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BugsService,
        { provide: getRepositoryToken(BugReport), useValue: bugRepo },
      ],
    }).compile();

    service = module.get<BugsService>(BugsService);
  });

  afterEach(() => jest.clearAllMocks());

  // ═══════════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════════

  describe('create', () => {
    const dto = {
      description: 'Button does not work',
      severity: 'high',
      section: '/work-orders',
      viewport: '1920x1080',
      userAgent: 'Mozilla/5.0',
      project: 'TORQUE 360',
    };

    it('should create a bug report with content hash', async () => {
      bugRepo.findOne.mockResolvedValue(null);
      const expected = { id: 'b1', tenantId, ...dto, status: 'new' };
      bugRepo.create.mockReturnValue(expected);
      bugRepo.save.mockResolvedValue(expected);

      const result = await service.create(tenantId, dto as any, 'user-1');

      expect(bugRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId,
          userId: 'user-1',
          description: dto.description,
          severity: 'high',
          status: 'new',
          contentHash: expect.any(String),
        }),
      );
      expect(result.status).toBe('new');
    });

    it('should throw ConflictException on duplicate hash', async () => {
      bugRepo.findOne.mockResolvedValue({ id: 'b-existing' });

      await expect(service.create(tenantId, dto as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should allow creation without userId', async () => {
      bugRepo.findOne.mockResolvedValue(null);
      const expected = { id: 'b2', tenantId, ...dto, userId: null };
      bugRepo.create.mockReturnValue(expected);
      bugRepo.save.mockResolvedValue(expected);

      const result = await service.create(tenantId, dto as any);

      expect(bugRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
      expect(result.id).toBe('b2');
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════════

  describe('findById', () => {
    it('should return bug when found', async () => {
      const bug = { id: 'b1', tenantId, description: 'Test' };
      bugRepo.findOne.mockResolvedValue(bug);

      const result = await service.findById(tenantId, 'b1');

      expect(result).toEqual(bug);
    });

    it('should throw NotFoundException when not found', async () => {
      bugRepo.findOne.mockResolvedValue(null);

      await expect(service.findById(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  updateStatus
  // ═══════════════════════════════════════════════════════════════════

  describe('updateStatus', () => {
    it('should update status and set notes', async () => {
      const bug = { id: 'b1', tenantId, status: 'new', notes: null, resolvedBy: null, resolvedAt: null };
      bugRepo.findOne.mockResolvedValue(bug);
      bugRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.updateStatus(tenantId, 'b1', {
        status: 'viewed',
        notes: 'Looking into it',
      } as any);

      expect(result.status).toBe('viewed');
      expect(result.notes).toBe('Looking into it');
    });

    it('should set resolvedBy and resolvedAt when fixed', async () => {
      const bug = { id: 'b1', tenantId, status: 'in_progress', notes: null, resolvedBy: null, resolvedAt: null };
      bugRepo.findOne.mockResolvedValue(bug);
      bugRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.updateStatus(
        tenantId, 'b1',
        { status: 'fixed' } as any,
        'admin-1',
      );

      expect(result.status).toBe('fixed');
      expect(result.resolvedBy).toBe('admin-1');
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it('should set resolvedAt when dismissed', async () => {
      const bug = { id: 'b1', tenantId, status: 'new', notes: null, resolvedBy: null, resolvedAt: null };
      bugRepo.findOne.mockResolvedValue(bug);
      bugRepo.save.mockImplementation((entity: any) => Promise.resolve(entity));

      const result = await service.updateStatus(
        tenantId, 'b1',
        { status: 'dismissed' } as any,
      );

      expect(result.status).toBe('dismissed');
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  remove
  // ═══════════════════════════════════════════════════════════════════

  describe('remove', () => {
    it('should remove a bug report', async () => {
      const bug = { id: 'b1', tenantId };
      bugRepo.findOne.mockResolvedValue(bug);
      bugRepo.remove.mockResolvedValue(bug);

      await service.remove(tenantId, 'b1');

      expect(bugRepo.remove).toHaveBeenCalledWith(bug);
    });

    it('should throw NotFoundException if bug does not exist', async () => {
      bugRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(tenantId, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  findAll
  // ═══════════════════════════════════════════════════════════════════

  describe('findAll', () => {
    it('should return bugs ordered by createdAt DESC', async () => {
      const qb = createMockQueryBuilder();
      bugRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([{ id: 'b1' }]);

      const result = await service.findAll(tenantId);

      expect(result).toHaveLength(1);
      expect(qb.orderBy).toHaveBeenCalledWith('b.created_at', 'DESC');
    });

    it('should filter by status', async () => {
      const qb = createMockQueryBuilder();
      bugRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { status: 'new' });

      expect(qb.andWhere).toHaveBeenCalledWith('b.status = :status', { status: 'new' });
    });

    it('should filter by severity', async () => {
      const qb = createMockQueryBuilder();
      bugRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { severity: 'critical' });

      expect(qb.andWhere).toHaveBeenCalledWith('b.severity = :severity', { severity: 'critical' });
    });

    it('should apply search filter', async () => {
      const qb = createMockQueryBuilder();
      bugRepo.createQueryBuilder.mockReturnValue(qb);
      qb.getMany.mockResolvedValue([]);

      await service.findAll(tenantId, { search: 'button' });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        { search: '%button%' },
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════
  //  getStats
  // ═══════════════════════════════════════════════════════════════════

  describe('getStats', () => {
    it('should return total, byStatus, and bySeverity', async () => {
      bugRepo.find.mockResolvedValue([
        { status: 'new', severity: 'high' },
        { status: 'new', severity: 'low' },
        { status: 'fixed', severity: 'high' },
      ]);

      const result = await service.getStats(tenantId);

      expect(result.total).toBe(3);
      expect(result.byStatus).toEqual({ new: 2, fixed: 1 });
      expect(result.bySeverity).toEqual({ high: 2, low: 1 });
    });

    it('should return zeros when no bugs exist', async () => {
      bugRepo.find.mockResolvedValue([]);

      const result = await service.getStats(tenantId);

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
      expect(result.bySeverity).toEqual({});
    });
  });
});
