import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { ClientsModule } from './modules/clients/clients.module';
import { WorkOrdersModule } from './modules/work-orders/work-orders.module';
import { QuotationsModule } from './modules/quotations/quotations.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AuditModule } from './modules/audit/audit.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { WmsModule } from './modules/wms/wms.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { ImportsModule } from './modules/imports/imports.module';
import { TraceabilityModule } from './modules/traceability/traceability.module';
import { AutomationModule } from './modules/automation/automation.module';
import { CommandCenterModule } from './modules/command-center/command-center.module';
import { FacturacionModule } from './modules/facturacion/facturacion.module';
import { SalesPipelineModule } from './modules/sales-pipeline/sales-pipeline.module';
import { RrhhModule } from './modules/rrhh/rrhh.module';
import { ExternalPortalModule } from './modules/external-portal/external-portal.module';
import { CustomerPortalModule } from './modules/customer-portal/customer-portal.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BackupModule } from './modules/backup/backup.module';
import { HealthModule } from './modules/health/health.module';
import { Company360Module } from './modules/company360/company360.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get('DATABASE_USER', 'torque'),
        password: config.get('DATABASE_PASSWORD', 'torque360'),
        database: config.get('DATABASE_NAME', 'torque360'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    AuthModule,
    TenantsModule,
    UsersModule,
    VehiclesModule,
    ClientsModule,
    WorkOrdersModule,
    QuotationsModule,
    InventoryModule,
    AuditModule,
    DashboardModule,
    ApprovalsModule,
    WmsModule,
    CompaniesModule,
    Company360Module,
    SuppliersModule,
    ImportsModule,
    TraceabilityModule,
    AutomationModule,
    CommandCenterModule,
    FacturacionModule,
    SalesPipelineModule,
    RrhhModule,
    ExternalPortalModule,
    CustomerPortalModule,
    OnboardingModule,
    ReportsModule,
    BackupModule,
    HealthModule,
  ],
})
export class AppModule {}
