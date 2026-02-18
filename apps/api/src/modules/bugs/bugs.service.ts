import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { BugReport } from '../../database/entities/bug-report.entity';
import { CreateBugReportDto, UpdateBugStatusDto } from './bugs.dto';

@Injectable()
export class BugsService {
  constructor(
    @InjectRepository(BugReport) private bugRepo: Repository<BugReport>,
  ) {}

  private buildHash(tenantId: string, dto: CreateBugReportDto): string {
    const raw = `${tenantId}:${dto.section}:${dto.severity}:${dto.description}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  async create(
    tenantId: string,
    dto: CreateBugReportDto,
    userId?: string,
  ): Promise<BugReport> {
    const contentHash = this.buildHash(tenantId, dto);

    const existing = await this.bugRepo.findOne({
      where: { tenantId, contentHash },
    });
    if (existing) {
      throw new ConflictException('Duplicate bug report already exists');
    }

    const bug = this.bugRepo.create({
      tenantId,
      userId: userId ?? null,
      userLabel: dto.userLabel,
      description: dto.description,
      severity: dto.severity,
      section: dto.section,
      url: dto.url,
      viewport: dto.viewport,
      userAgent: dto.userAgent,
      browserLang: dto.browserLang,
      jsErrors: dto.jsErrors || null,
      project: dto.project,
      contentHash,
      status: 'new',
    });

    return this.bugRepo.save(bug);
  }

  async findAll(
    tenantId: string,
    filters?: {
      status?: string;
      severity?: string;
      search?: string;
      section?: string;
    },
  ): Promise<BugReport[]> {
    const qb = this.bugRepo
      .createQueryBuilder('b')
      .where('b.tenant_id = :tenantId', { tenantId })
      .orderBy('b.created_at', 'DESC');

    if (filters?.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    if (filters?.severity) {
      qb.andWhere('b.severity = :severity', { severity: filters.severity });
    }
    if (filters?.section) {
      qb.andWhere('b.section = :section', { section: filters.section });
    }
    if (filters?.search) {
      qb.andWhere(
        '(b.description ILIKE :search OR b.section ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    return qb.getMany();
  }

  async findById(tenantId: string, id: string): Promise<BugReport> {
    const bug = await this.bugRepo.findOne({ where: { id, tenantId } });
    if (!bug) throw new NotFoundException('Bug report not found');
    return bug;
  }

  async updateStatus(
    tenantId: string,
    id: string,
    dto: UpdateBugStatusDto,
    resolvedBy?: string,
  ): Promise<BugReport> {
    const bug = await this.findById(tenantId, id);
    bug.status = dto.status;
    if (dto.notes) bug.notes = dto.notes;

    if (dto.status === 'fixed' || dto.status === 'dismissed') {
      bug.resolvedBy = resolvedBy || null;
      bug.resolvedAt = new Date();
    }

    return this.bugRepo.save(bug);
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const bug = await this.findById(tenantId, id);
    await this.bugRepo.remove(bug);
  }

  async getStats(
    tenantId: string,
  ): Promise<{ total: number; byStatus: Record<string, number>; bySeverity: Record<string, number> }> {
    const bugs = await this.bugRepo.find({ where: { tenantId } });

    const byStatus: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    for (const bug of bugs) {
      byStatus[bug.status] = (byStatus[bug.status] || 0) + 1;
      bySeverity[bug.severity] = (bySeverity[bug.severity] || 0) + 1;
    }

    return { total: bugs.length, byStatus, bySeverity };
  }
}
