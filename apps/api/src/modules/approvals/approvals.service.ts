import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Approval } from '../../database/entities/approval.entity';
import { Notification } from '../../database/entities/notification.entity';
import { User } from '../../database/entities/user.entity';

const ROLE_HIERARCHY: Record<string, number> = {
  OWNER: 50, ADMIN: 40, MANAGER: 30, OPERATOR: 20, VIEWER: 10,
};

interface CreateApprovalDto {
  entityType: string;
  entityId: string;
  approvalType: string;
  requiredRole: string;
  description?: string;
  context?: Record<string, unknown>;
  assignedTo?: string;
}

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(Approval) private approvalRepo: Repository<Approval>,
    @InjectRepository(Notification) private notifRepo: Repository<Notification>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async requestApproval(tenantId: string, requestedBy: string, dto: CreateApprovalDto) {
    const approval = this.approvalRepo.create({
      tenantId,
      requestedBy,
      entityType: dto.entityType,
      entityId: dto.entityId,
      approvalType: dto.approvalType,
      requiredRole: dto.requiredRole,
      description: dto.description,
      context: dto.context || {},
      assignedTo: dto.assignedTo,
      status: 'pending',
    });
    await this.approvalRepo.save(approval);

    // Notify all users with required role or higher
    const requiredLevel = ROLE_HIERARCHY[dto.requiredRole] || 30;
    const eligibleUsers = await this.userRepo.find({
      where: { tenantId, isActive: true },
    });

    const toNotify = eligibleUsers.filter(
      (u) => (ROLE_HIERARCHY[u.role] || 0) >= requiredLevel,
    );

    const notifications = toNotify.map((u) =>
      this.notifRepo.create({
        tenantId,
        userId: u.id,
        type: 'approval_request',
        channel: 'in_app',
        title: `Aprobación requerida: ${dto.approvalType}`,
        message: dto.description || `Se requiere aprobación para ${dto.entityType} ${dto.entityId}`,
        entityType: dto.entityType,
        entityId: dto.entityId,
        actionUrl: `/approvals/${approval.id}`,
        metadata: { approvalId: approval.id },
      }),
    );
    await this.notifRepo.save(notifications);

    return approval;
  }

  async approve(tenantId: string, approvalId: string, userId: string, userRole: string, reason?: string) {
    const approval = await this.approvalRepo.findOne({
      where: { id: approvalId, tenantId },
    });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.status !== 'pending') {
      throw new ForbiddenException('Approval already processed');
    }

    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[approval.requiredRole] || 30;
    if (userLevel < requiredLevel) {
      throw new ForbiddenException('Insufficient role to approve');
    }

    approval.status = 'approved';
    approval.decidedBy = userId;
    approval.reason = reason ?? '';
    approval.decidedAt = new Date();
    await this.approvalRepo.save(approval);

    // Notify requester
    await this.notifRepo.save(
      this.notifRepo.create({
        tenantId,
        userId: approval.requestedBy,
        type: 'approval_approved',
        channel: 'in_app',
        title: 'Solicitud aprobada',
        message: `Tu solicitud de ${approval.approvalType} fue aprobada${reason ? ': ' + reason : ''}`,
        entityType: approval.entityType,
        entityId: approval.entityId,
      }),
    );

    // Always notify OWNER
    const owners = await this.userRepo.find({
      where: { tenantId, role: 'OWNER', isActive: true },
    });
    for (const owner of owners) {
      if (owner.id !== userId && owner.id !== approval.requestedBy) {
        await this.notifRepo.save(
          this.notifRepo.create({
            tenantId,
            userId: owner.id,
            type: 'approval_info',
            channel: 'in_app',
            title: `Aprobación procesada`,
            message: `${approval.approvalType} para ${approval.entityType} fue aprobada`,
            entityType: approval.entityType,
            entityId: approval.entityId,
          }),
        );
      }
    }

    return approval;
  }

  async reject(tenantId: string, approvalId: string, userId: string, userRole: string, reason: string) {
    const approval = await this.approvalRepo.findOne({
      where: { id: approvalId, tenantId },
    });
    if (!approval) throw new NotFoundException('Approval not found');
    if (approval.status !== 'pending') {
      throw new ForbiddenException('Approval already processed');
    }

    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const requiredLevel = ROLE_HIERARCHY[approval.requiredRole] || 30;
    if (userLevel < requiredLevel) {
      throw new ForbiddenException('Insufficient role to reject');
    }

    approval.status = 'rejected';
    approval.decidedBy = userId;
    approval.reason = reason;
    approval.decidedAt = new Date();
    await this.approvalRepo.save(approval);

    await this.notifRepo.save(
      this.notifRepo.create({
        tenantId,
        userId: approval.requestedBy,
        type: 'approval_rejected',
        channel: 'in_app',
        title: 'Solicitud rechazada',
        message: `Tu solicitud de ${approval.approvalType} fue rechazada: ${reason}`,
        entityType: approval.entityType,
        entityId: approval.entityId,
      }),
    );

    return approval;
  }

  async getPending(tenantId: string, userRole: string) {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const approvals = await this.approvalRepo.find({
      where: { tenantId, status: 'pending' },
      order: { createdAt: 'DESC' },
    });

    return approvals.filter(
      (a) => (ROLE_HIERARCHY[a.requiredRole] || 0) <= userLevel,
    );
  }

  async getAll(tenantId: string, status?: string) {
    const where: Record<string, unknown> = { tenantId };
    if (status) where.status = status;
    return this.approvalRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async getByEntity(tenantId: string, entityType: string, entityId: string) {
    return this.approvalRepo.find({
      where: { tenantId, entityType, entityId },
      order: { createdAt: 'DESC' },
    });
  }
}
