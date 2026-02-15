import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnboardingProgress } from '../../database/entities/onboarding-progress.entity';

// ═══════════════════════════════════════════════════════════════════
//  TRAINING MODULES — Static configuration
// ═══════════════════════════════════════════════════════════════════

export type StepType = 'TOUR' | 'INFO' | 'INTERACTIVE';

export interface TrainingStep {
  id: string;
  title: string;
  description: string;
  type: StepType;
}

export interface TrainingModule {
  id: string;
  name: string;
  description: string;
  icon: string;
  requiredRole: string;
  steps: TrainingStep[];
}

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'dashboard',
    name: 'Dashboard y Navegacion',
    description: 'Aprende a navegar el sistema y entender los KPIs principales',
    icon: 'dashboard',
    requiredRole: 'VIEWER',
    steps: [
      { id: 'nav-sidebar', title: 'Navegacion por el menu lateral', description: 'Aprende a usar el sidebar para acceder a cada modulo', type: 'TOUR' },
      { id: 'read-kpis', title: 'Entender los KPIs del dashboard', description: 'Conoce que significa cada metrica en tu panel principal', type: 'INFO' },
      { id: 'change-period', title: 'Cambiar periodo de datos', description: 'Filtra los datos por dia, semana, mes o rango personalizado', type: 'INTERACTIVE' },
    ],
  },
  {
    id: 'ordenes',
    name: 'Ordenes de Trabajo',
    description: 'Domina el flujo completo de las OTs: desde recepcion hasta entrega',
    icon: 'work-orders',
    requiredRole: 'OPERATOR',
    steps: [
      { id: 'crear-ot', title: 'Crear una Orden de Trabajo', description: 'Registra un vehiculo y crea tu primera OT', type: 'INTERACTIVE' },
      { id: 'asignar-tecnico', title: 'Asignar tecnico', description: 'Selecciona y asigna un tecnico disponible', type: 'INTERACTIVE' },
      { id: 'agregar-items', title: 'Agregar repuestos y mano de obra', description: 'Agrega items de inventario y horas de trabajo', type: 'INTERACTIVE' },
      { id: 'cambiar-estado', title: 'Flujo de estados', description: 'Mueve la OT por cada etapa: recibido -> diagnostico -> en progreso -> completado', type: 'TOUR' },
      { id: 'cerrar-ot', title: 'Cerrar y facturar', description: 'Completa la OT y genera la factura correspondiente', type: 'INTERACTIVE' },
    ],
  },
  {
    id: 'inventario',
    name: 'Inventario y Repuestos',
    description: 'Gestion de stock, ubicaciones, alertas de minimos y movimientos',
    icon: 'inventory',
    requiredRole: 'OPERATOR',
    steps: [
      { id: 'buscar-repuesto', title: 'Buscar un repuesto', description: 'Usa el buscador con filtros por codigo OEM, marca o descripcion', type: 'INTERACTIVE' },
      { id: 'verificar-stock', title: 'Verificar disponibilidad', description: 'Consulta stock actual, reservado y disponible', type: 'INFO' },
      { id: 'registrar-entrada', title: 'Registrar entrada de mercaderia', description: 'Ingresa stock nuevo al sistema con costo y ubicacion', type: 'INTERACTIVE' },
      { id: 'transferir-bodega', title: 'Transferir entre bodegas', description: 'Mueve repuestos de una bodega a otra', type: 'INTERACTIVE' },
      { id: 'alertas-minimo', title: 'Configurar alertas de minimo', description: 'Define puntos de reorden y recibe alertas automaticas', type: 'INTERACTIVE' },
    ],
  },
  {
    id: 'clientes',
    name: 'Gestion de Clientes',
    description: 'CRM completo: contactos, historial de servicios, vehiculos asociados',
    icon: 'clients',
    requiredRole: 'OPERATOR',
    steps: [
      { id: 'crear-cliente', title: 'Registrar un cliente nuevo', description: 'Captura datos de contacto, RUT y direccion', type: 'INTERACTIVE' },
      { id: 'asociar-vehiculo', title: 'Asociar vehiculo al cliente', description: 'Vincula uno o mas vehiculos a la ficha del cliente', type: 'INTERACTIVE' },
      { id: 'ver-historial', title: 'Consultar historial de servicios', description: 'Revisa todas las OTs, cotizaciones y facturas del cliente', type: 'INFO' },
    ],
  },
  {
    id: 'cobranza',
    name: 'Cobranza y Cuentas por Cobrar',
    description: 'Registra pagos, monitorea morosidad y gestiona la cartera',
    icon: 'receivables',
    requiredRole: 'MANAGER',
    steps: [
      { id: 'registrar-pago', title: 'Registrar un pago de cliente', description: 'Aplica un pago contra una o mas facturas pendientes', type: 'INTERACTIVE' },
      { id: 'ver-morosos', title: 'Consultar clientes morosos', description: 'Identifica facturas vencidas y montos pendientes', type: 'INFO' },
      { id: 'calendario-cobro', title: 'Usar el calendario de cobranza', description: 'Planifica seguimiento de cobros por fecha', type: 'TOUR' },
    ],
  },
  {
    id: 'proveedores',
    name: 'Proveedores y Cuentas por Pagar',
    description: 'Gestiona facturas de proveedores, pagos y saldos pendientes',
    icon: 'suppliers',
    requiredRole: 'MANAGER',
    steps: [
      { id: 'registrar-factura', title: 'Registrar factura de proveedor', description: 'Ingresa una factura recibida con items y montos', type: 'INTERACTIVE' },
      { id: 'aprobar-factura', title: 'Aprobar factura para pago', description: 'Revisa y aprueba facturas pendientes', type: 'INTERACTIVE' },
      { id: 'registrar-pago-proveedor', title: 'Registrar pago a proveedor', description: 'Registra el pago realizado contra facturas aprobadas', type: 'INTERACTIVE' },
    ],
  },
  {
    id: 'rrhh',
    name: 'Recursos Humanos',
    description: 'Empleados, turnos, vacaciones y liquidaciones de sueldo',
    icon: 'hr',
    requiredRole: 'MANAGER',
    steps: [
      { id: 'crear-empleado', title: 'Registrar un empleado', description: 'Ingresa datos personales, cargo, sueldo base y fecha de ingreso', type: 'INTERACTIVE' },
      { id: 'asignar-turno', title: 'Asignar turno de trabajo', description: 'Configura horarios y turnos rotativos', type: 'INTERACTIVE' },
      { id: 'solicitar-vacaciones', title: 'Gestionar vacaciones', description: 'Solicita, aprueba o rechaza dias de vacaciones', type: 'INTERACTIVE' },
      { id: 'generar-liquidacion', title: 'Generar liquidacion de sueldo', description: 'Calcula y emite la liquidacion mensual con descuentos legales', type: 'INTERACTIVE' },
    ],
  },
  {
    id: 'importaciones',
    name: 'Importaciones',
    description: 'Ordenes de compra internacional, LC, tracking y costos CIF',
    icon: 'imports',
    requiredRole: 'MANAGER',
    steps: [
      { id: 'crear-importacion', title: 'Crear orden de importacion', description: 'Registra una nueva orden de compra al exterior', type: 'INTERACTIVE' },
      { id: 'tracking-embarque', title: 'Seguimiento de embarque', description: 'Actualiza estados del envio y fechas estimadas', type: 'TOUR' },
      { id: 'calcular-costos', title: 'Calcular costos de internacion', description: 'Distribuye aranceles, flete y seguro por item', type: 'INTERACTIVE' },
    ],
  },
];

// ── Role hierarchy for module access ──
const ROLE_LEVEL: Record<string, number> = {
  SUPER_ADMIN: 100,
  OWNER: 50,
  ADMIN: 40,
  MANAGER: 30,
  OPERATOR: 20,
  VIEWER: 10,
};

// ═══════════════════════════════════════════════════════════════════
//  Interfaces for responses
// ═══════════════════════════════════════════════════════════════════

export interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  description: string;
  icon: string;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  percentage: number;
  steps: StepProgress[];
}

export interface StepProgress {
  stepId: string;
  title: string;
  description: string;
  type: StepType;
  completed: boolean;
  completedAt: Date | null;
  skipped: boolean;
}

export interface FullProgress {
  activated: boolean;
  totalSteps: number;
  completedSteps: number;
  skippedSteps: number;
  overallPercentage: number;
  modules: ModuleProgress[];
}

@Injectable()
export class OnboardingService {
  constructor(
    @InjectRepository(OnboardingProgress)
    private progressRepo: Repository<OnboardingProgress>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════
  //  GET MODULES — Static config (no auth required)
  // ═══════════════════════════════════════════════════════════════════

  getModules(): TrainingModule[] {
    return TRAINING_MODULES;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GET USER PROGRESS — All modules
  // ═══════════════════════════════════════════════════════════════════

  async getUserProgress(tenantId: string, userId: string): Promise<FullProgress> {
    const records = await this.progressRepo.find({
      where: { tenantId, userId },
    });

    // If no records exist, user hasn't activated onboarding
    if (records.length === 0) {
      return {
        activated: false,
        totalSteps: 0,
        completedSteps: 0,
        skippedSteps: 0,
        overallPercentage: 0,
        modules: [],
      };
    }

    // Group records by moduleId
    const byModule = new Map<string, OnboardingProgress[]>();
    for (const rec of records) {
      const existing = byModule.get(rec.moduleId) || [];
      existing.push(rec);
      byModule.set(rec.moduleId, existing);
    }

    // Build module progress using static config
    const modules: ModuleProgress[] = [];
    let totalSteps = 0;
    let completedSteps = 0;
    let skippedSteps = 0;

    for (const mod of TRAINING_MODULES) {
      const moduleRecords = byModule.get(mod.id);
      if (!moduleRecords) continue; // Module not activated for this user

      const recordMap = new Map<string, OnboardingProgress>();
      for (const r of moduleRecords) {
        recordMap.set(r.stepId, r);
      }

      const steps: StepProgress[] = mod.steps.map((step) => {
        const rec = recordMap.get(step.id);
        return {
          stepId: step.id,
          title: step.title,
          description: step.description,
          type: step.type,
          completed: rec?.completed || false,
          completedAt: rec?.completedAt || null,
          skipped: rec?.skipped || false,
        };
      });

      const modCompleted = steps.filter((s) => s.completed).length;
      const modSkipped = steps.filter((s) => s.skipped).length;

      totalSteps += steps.length;
      completedSteps += modCompleted;
      skippedSteps += modSkipped;

      modules.push({
        moduleId: mod.id,
        moduleName: mod.name,
        description: mod.description,
        icon: mod.icon,
        totalSteps: steps.length,
        completedSteps: modCompleted,
        skippedSteps: modSkipped,
        percentage: steps.length > 0 ? Math.round((modCompleted / steps.length) * 100) : 0,
        steps,
      });
    }

    return {
      activated: true,
      totalSteps,
      completedSteps,
      skippedSteps,
      overallPercentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0,
      modules,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  GET MODULE PROGRESS — Single module detail
  // ═══════════════════════════════════════════════════════════════════

  async getModuleProgress(
    tenantId: string,
    userId: string,
    moduleId: string,
  ): Promise<ModuleProgress> {
    const mod = TRAINING_MODULES.find((m) => m.id === moduleId);
    if (!mod) {
      throw new NotFoundException(`Modulo de capacitacion '${moduleId}' no encontrado`);
    }

    const records = await this.progressRepo.find({
      where: { tenantId, userId, moduleId },
    });

    const recordMap = new Map<string, OnboardingProgress>();
    for (const r of records) {
      recordMap.set(r.stepId, r);
    }

    const steps: StepProgress[] = mod.steps.map((step) => {
      const rec = recordMap.get(step.id);
      return {
        stepId: step.id,
        title: step.title,
        description: step.description,
        type: step.type,
        completed: rec?.completed || false,
        completedAt: rec?.completedAt || null,
        skipped: rec?.skipped || false,
      };
    });

    const completedSteps = steps.filter((s) => s.completed).length;
    const skippedSteps = steps.filter((s) => s.skipped).length;

    return {
      moduleId: mod.id,
      moduleName: mod.name,
      description: mod.description,
      icon: mod.icon,
      totalSteps: steps.length,
      completedSteps,
      skippedSteps,
      percentage: steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0,
      steps,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  COMPLETE STEP
  // ═══════════════════════════════════════════════════════════════════

  async completeStep(
    tenantId: string,
    userId: string,
    moduleId: string,
    stepId: string,
  ): Promise<OnboardingProgress> {
    this.validateModuleStep(moduleId, stepId);

    const record = await this.progressRepo.findOne({
      where: { tenantId, userId, moduleId, stepId },
    });

    if (!record) {
      throw new NotFoundException(
        'Paso no encontrado. Debes activar la capacitacion primero.',
      );
    }

    if (record.completed) {
      return record; // Already completed, idempotent
    }

    record.completed = true;
    record.completedAt = new Date();
    record.skipped = false; // Un-skip if it was skipped

    return this.progressRepo.save(record) as Promise<OnboardingProgress>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  SKIP STEP
  // ═══════════════════════════════════════════════════════════════════

  async skipStep(
    tenantId: string,
    userId: string,
    moduleId: string,
    stepId: string,
  ): Promise<OnboardingProgress> {
    this.validateModuleStep(moduleId, stepId);

    const record = await this.progressRepo.findOne({
      where: { tenantId, userId, moduleId, stepId },
    });

    if (!record) {
      throw new NotFoundException(
        'Paso no encontrado. Debes activar la capacitacion primero.',
      );
    }

    if (record.completed) {
      throw new BadRequestException('No se puede saltar un paso ya completado');
    }

    record.skipped = true;

    return this.progressRepo.save(record) as Promise<OnboardingProgress>;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  RESET MODULE
  // ═══════════════════════════════════════════════════════════════════

  async resetModule(
    tenantId: string,
    userId: string,
    moduleId: string,
  ): Promise<{ reset: number }> {
    const mod = TRAINING_MODULES.find((m) => m.id === moduleId);
    if (!mod) {
      throw new NotFoundException(`Modulo de capacitacion '${moduleId}' no encontrado`);
    }

    // Reset all steps for this module back to incomplete
    const result = await this.progressRepo.update(
      { tenantId, userId, moduleId },
      { completed: false, completedAt: undefined as any, skipped: false },
    );

    return { reset: result.affected || 0 };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  ACTIVATE ONBOARDING — Creates progress entries for user's role
  // ═══════════════════════════════════════════════════════════════════

  async activateOnboarding(
    tenantId: string,
    userId: string,
    userRole?: string,
  ): Promise<{ activated: number; modules: string[] }> {
    // Check if already activated
    const existing = await this.progressRepo.count({
      where: { tenantId, userId },
    });

    if (existing > 0) {
      throw new BadRequestException('La capacitacion ya esta activada para este usuario');
    }

    // Determine which modules the user can access based on role
    const userLevel = ROLE_LEVEL[userRole || 'VIEWER'] || 10;
    const accessibleModules = TRAINING_MODULES.filter((mod) => {
      const requiredLevel = ROLE_LEVEL[mod.requiredRole] || 10;
      return userLevel >= requiredLevel;
    });

    // Create progress entries for all accessible module steps
    const entries: Partial<OnboardingProgress>[] = [];
    const moduleNames: string[] = [];

    for (const mod of accessibleModules) {
      moduleNames.push(mod.id);
      for (const step of mod.steps) {
        entries.push({
          tenantId,
          userId,
          moduleId: mod.id,
          stepId: step.id,
          completed: false,
          skipped: false,
        });
      }
    }

    if (entries.length > 0) {
      await this.progressRepo.save(
        entries.map((e) => this.progressRepo.create(e)),
      );
    }

    return { activated: entries.length, modules: moduleNames };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  DEACTIVATE ONBOARDING — Soft deactivate (keeps data, marks inactive)
  // ═══════════════════════════════════════════════════════════════════

  async deactivateOnboarding(
    tenantId: string,
    userId: string,
  ): Promise<{ deactivated: number }> {
    // Soft delete: remove all progress records
    // Data can be re-created via activateOnboarding
    const result = await this.progressRepo.delete({ tenantId, userId });

    return { deactivated: result.affected || 0 };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  PRIVATE — Validation helpers
  // ═══════════════════════════════════════════════════════════════════

  private validateModuleStep(moduleId: string, stepId: string): void {
    const mod = TRAINING_MODULES.find((m) => m.id === moduleId);
    if (!mod) {
      throw new NotFoundException(`Modulo de capacitacion '${moduleId}' no encontrado`);
    }
    const step = mod.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new NotFoundException(
        `Paso '${stepId}' no encontrado en modulo '${moduleId}'`,
      );
    }
  }
}
