import { SetMetadata } from '@nestjs/common';

export type Role = 'SUPER_ADMIN' | 'OWNER' | 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// Module access mapping — defines which modules each role can access by default
// SUPER_ADMIN: all modules + command-center (global market view)
// OWNER/MANAGER: all company modules (global de su empresa)
// ADMIN: operational modules (no financials by default)
// OPERATOR: only modules assigned to their job description
// VIEWER: read-only on assigned modules
export const MODULE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'], // Everything + command-center
  OWNER: [
    'dashboard', 'vehiculos', 'clientes', 'ordenes', 'cotizaciones',
    'inventario', 'bodega', 'importaciones', 'trazabilidad',
    'aprobaciones', 'proveedores', 'empresas', 'reportes',
    'configuracion', 'usuarios', 'finanzas', 'rrhh', 'audit',
  ],
  ADMIN: [
    'dashboard', 'vehiculos', 'clientes', 'ordenes', 'cotizaciones',
    'inventario', 'bodega', 'importaciones', 'trazabilidad',
    'aprobaciones', 'proveedores', 'empresas', 'reportes',
    'configuracion', 'usuarios',
  ],
  MANAGER: [
    'dashboard', 'vehiculos', 'clientes', 'ordenes', 'cotizaciones',
    'inventario', 'bodega', 'importaciones', 'trazabilidad',
    'aprobaciones', 'proveedores', 'reportes',
  ],
  OPERATOR: [
    'dashboard', 'ordenes', 'inventario',
  ],
  VIEWER: [
    'dashboard',
  ],
};
