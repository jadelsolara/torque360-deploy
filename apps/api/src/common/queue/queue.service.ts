import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job, ConnectionOptions } from 'bullmq';

export type JobProcessor<T = unknown, R = unknown> = (job: Job<T>) => Promise<R>;

export interface QueueRegistration {
  queue: Queue;
  worker?: Worker;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private connection: ConnectionOptions;
  private readonly registrations = new Map<string, QueueRegistration>();

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.connection = {
      host: this.config.get('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get('REDIS_PASSWORD', undefined),
    };
    this.logger.log('BullMQ queue service initialized');
  }

  async onModuleDestroy() {
    for (const [name, reg] of this.registrations) {
      await reg.worker?.close().catch(() => {});
      await reg.queue.close().catch(() => {});
      this.logger.log(`Queue "${name}" closed`);
    }
    this.registrations.clear();
  }

  // ── Queue Registration ────────────────────────────────────────────────

  getOrCreateQueue(name: string): Queue {
    const existing = this.registrations.get(name);
    if (existing) return existing.queue;

    const queue = new Queue(name, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    });

    this.registrations.set(name, { queue });
    this.logger.log(`Queue "${name}" created`);
    return queue;
  }

  registerWorker<T = unknown, R = unknown>(
    queueName: string,
    processor: JobProcessor<T, R>,
    concurrency = 3,
  ): Worker<T, R> {
    const reg = this.registrations.get(queueName);
    if (reg?.worker) return reg.worker as Worker<T, R>;

    const queue = this.getOrCreateQueue(queueName);

    const worker = new Worker<T, R>(queueName, processor, {
      connection: this.connection,
      concurrency,
    });

    worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} in "${queueName}" completed`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(
        `Job ${job?.id} in "${queueName}" failed: ${err.message}`,
      );
    });

    this.registrations.set(queueName, { queue, worker });
    this.logger.log(`Worker for "${queueName}" registered (concurrency: ${concurrency})`);
    return worker;
  }

  // ── Job Dispatch ──────────────────────────────────────────────────────

  async addJob<T = unknown>(
    queueName: string,
    jobName: string,
    data: T,
    options?: { delay?: number; priority?: number },
  ): Promise<Job<T>> {
    const queue = this.getOrCreateQueue(queueName);
    return queue.add(jobName, data, {
      delay: options?.delay,
      priority: options?.priority,
    });
  }

  async addBulk<T = unknown>(
    queueName: string,
    jobs: Array<{ name: string; data: T }>,
  ): Promise<Job<T>[]> {
    const queue = this.getOrCreateQueue(queueName);
    return queue.addBulk(jobs);
  }

  // ── Queue Status ──────────────────────────────────────────────────────

  async getQueueStats(queueName: string) {
    const queue = this.getOrCreateQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { queueName, waiting, active, completed, failed, delayed };
  }
}
