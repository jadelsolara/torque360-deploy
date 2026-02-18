import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';

const mockQueue = {
  add: jest.fn(),
  addBulk: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  getWaitingCount: jest.fn().mockResolvedValue(5),
  getActiveCount: jest.fn().mockResolvedValue(2),
  getCompletedCount: jest.fn().mockResolvedValue(100),
  getFailedCount: jest.fn().mockResolvedValue(3),
  getDelayedCount: jest.fn().mockResolvedValue(1),
};

const mockWorker = {
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('bullmq', () => ({
  Queue: jest.fn(() => mockQueue),
  Worker: jest.fn(() => mockWorker),
}));

describe('QueueService', () => {
  let service: QueueService;

  const mockConfig = {
    get: jest.fn((key: string, fallback?: unknown) => {
      const map: Record<string, unknown> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
      };
      return map[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ── Queue Creation ────────────────────────────────────────────────────

  describe('getOrCreateQueue', () => {
    it('should create a new queue', () => {
      const queue = service.getOrCreateQueue('invoices');
      expect(queue).toBe(mockQueue);
    });

    it('should return existing queue on second call', () => {
      const q1 = service.getOrCreateQueue('reports');
      const q2 = service.getOrCreateQueue('reports');
      expect(q1).toBe(q2);
    });
  });

  // ── Worker Registration ───────────────────────────────────────────────

  describe('registerWorker', () => {
    it('should register a worker for a queue', () => {
      const processor = jest.fn();
      const worker = service.registerWorker('emails', processor, 5);
      expect(worker).toBe(mockWorker);
      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
    });

    it('should return existing worker on duplicate registration', () => {
      const w1 = service.registerWorker('emails', jest.fn());
      const w2 = service.registerWorker('emails', jest.fn());
      expect(w1).toBe(w2);
    });
  });

  // ── Job Dispatch ──────────────────────────────────────────────────────

  describe('addJob', () => {
    it('should add a job to the queue', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });
      const job = await service.addJob('invoices', 'generate', { invoiceId: '123' });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'generate',
        { invoiceId: '123' },
        { delay: undefined, priority: undefined },
      );
      expect(job).toEqual({ id: 'job-1' });
    });

    it('should support delay and priority', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-2' });
      await service.addJob('reports', 'export', { type: 'csv' }, {
        delay: 5000,
        priority: 1,
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'export',
        { type: 'csv' },
        { delay: 5000, priority: 1 },
      );
    });
  });

  describe('addBulk', () => {
    it('should add multiple jobs at once', async () => {
      mockQueue.addBulk.mockResolvedValue([{ id: 'j1' }, { id: 'j2' }]);
      const jobs = await service.addBulk('payroll', [
        { name: 'calculate', data: { employeeId: 'e1' } },
        { name: 'calculate', data: { employeeId: 'e2' } },
      ]);
      expect(jobs).toHaveLength(2);
    });
  });

  // ── Queue Stats ───────────────────────────────────────────────────────

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats('invoices');
      expect(stats).toEqual({
        queueName: 'invoices',
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
      });
    });
  });
});
