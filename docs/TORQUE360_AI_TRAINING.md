# TORQUE 360 — AI Training Document
## Complete System Knowledge Base for ChromaDB Indexing

---

## 1. SYSTEM OVERVIEW

**TORQUE 360** is a multi-tenant SaaS ERP system designed specifically for the Chilean automotive industry. It serves three primary business segments:

- **Talleres de Servicio** (Service Workshops) — independent repair shops
- **Concesionarios** (Dealerships) — authorized brand dealers
- **Importadoras** (Importers) — auto parts importers from Asia/Europe

### Architecture
- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** NestJS 11 + TypeScript (modular monolith)
- **Database:** PostgreSQL 17 with Row-Level Security (multi-tenant isolation)
- **Cache:** Redis 7 (sessions, real-time, BullMQ queues)
- **Search:** Meilisearch (full-text, typo-tolerant)
- **Storage:** Cloudflare R2 (vehicle photos, documents)
- **Monorepo:** Turborepo with pnpm workspaces

### Multi-Tenant Architecture
Every table includes a `tenant_id` column. PostgreSQL RLS policies ensure that:
- Each tenant can ONLY see their own data
- The `current_tenant_id()` function reads from `app.current_tenant_id` session variable
- The `TenantGuard` in NestJS sets this variable on every authenticated request
- SUPER_ADMIN can bypass RLS or target a specific tenant via `X-Tenant-Id` header

---

## 2. DATABASE SCHEMA (51 Tables)

### Core Tables (init.sql)
| Table | Purpose |
|-------|---------|
| tenants | Multi-tenant registry (name, slug, plan, settings) |
| users | Authentication + RBAC (OWNER, ADMIN, MANAGER, OPERATOR, VIEWER, SUPER_ADMIN) |
| refresh_tokens | JWT refresh token management |
| vehicles | Vehicle registry (VIN, brand, model, year, mileage, engine_type) |
| clients | Customer CRM (PERSON or COMPANY type, RUT) |
| work_orders | Service orders (status workflow: PENDING→IN_PROGRESS→COMPLETED) |
| work_order_parts | Parts used in work orders (linked to inventory) |
| quotations | Price quotes (DRAFT→SENT→APPROVED→CONVERTED→REJECTED) |
| inventory_items | Parts inventory (SKU, OEM codes, stock levels, costs) |
| audit_logs | Immutable action history (blockchain-ready hash chain) |

### WMS + Supply Chain (migration 001)
| Table | Purpose |
|-------|---------|
| client_contacts | Multiple contacts per client company |
| client_portal_users | Customer self-service portal access |
| warehouses | Multi-warehouse management (MAIN, WORKSHOP, TRANSIT) |
| warehouse_locations | Bin/shelf locations within warehouses |
| stock_locations | Inventory-to-location mapping |
| stock_movements | Every stock change (IN, OUT, TRANSFER, ADJUST) |
| picking_orders | Warehouse pick lists for work orders |
| picking_order_items | Individual items in pick orders |
| goods_receipts | Inbound receiving from suppliers |
| goods_receipt_items | Items received per receipt |
| suppliers | Supplier directory (RUT, terms, currency, category) |
| import_orders | Import purchase orders (LC, shipping, customs) |
| import_order_items | Individual items in import orders (HS codes) |
| traceability_chain | Full part traceability (supplier→warehouse→work_order→vehicle) |
| vehicle_service_history | Complete vehicle service history |

### Sales Pipeline (migration 002)
Extends quotations and work_orders with:
- Pipeline stage tracking (LEAD→CONTACTED→QUOTED→NEGOTIATION→WON/LOST)
- Follow-up scheduling
- Conversion tracking
- Rejection reasons
- Margin calculations

### Business Operations (migration 003 — 26 tables)
| Table | Purpose |
|-------|---------|
| companies | Company legal data (RUT, razón social, giro SII) |
| exchange_rates | Currency rates (USD/EUR/CNY→CLP, Banco Central source) |
| approvals | Workflow approval system (quotes, POs, discounts) |
| notifications | Multi-channel notifications (IN_APP, EMAIL, SMS, PUSH) |
| automation_rules | Trigger-based automation (low stock alerts, follow-ups) |
| invoices | SII Chile electronic invoicing (DTE types 33,34,39,56,61,52) |
| invoice_items | Invoice line items (SII format: NmbItem, QtyItem, PrcItem) |
| caf_folios | SII CAF folio ranges (DTE authorization, RSA keys) |
| employees | HR records (RUT, AFP, ISAPRE/FONASA, contract type) |
| payrolls | Monthly payroll periods (UF/UTM values, totals) |
| payroll_details | Individual payroll (haberes, descuentos legales, aportes) |
| attendance | Time tracking (check in/out, overtime, medical leave) |
| external_accesses | External agent portal (import agents, token auth) |
| import_update_logs | Import order change tracking (field-level audit) |
| supplier_invoices | Supplier invoice management (multi-currency) |
| supplier_invoice_items | Supplier invoice line items |
| supplier_payments | Outbound payments to suppliers (TRANSFERENCIA, CHEQUE, etc.) |
| client_payments | Inbound client payments (WEBPAY, FLOW, TRANSFERENCIA) |
| customer_tickets | Customer support tickets (categories, paid reports) |
| customer_messages | Ticket conversation messages |
| customer_accesses | Customer portal authentication (PIN-based) |
| onboarding_progress | User training/onboarding step tracking |
| report_requests | Custom report generation requests |
| data_exports | Data export jobs (CSV, EXCEL, PDF with expiry) |
| backup_records | Backup management (type, target, status, checksum) |
| storage_metrics | Tenant storage usage monitoring (quotas, alerts) |

---

## 3. BACKEND MODULES (28 NestJS Modules)

### Authentication & Authorization
- **AuthModule** — JWT login/register, refresh tokens, MFA ready
- **TenantsModule** — Tenant CRUD, plan management
- **UsersModule** — User CRUD, role management, password reset

### Core Operations
- **VehiclesModule** — Vehicle registry, VIN validation, service history
- **ClientsModule** — CRM, contacts, client types (PERSON/COMPANY)
- **WorkOrdersModule** — Full OT lifecycle, part allocation, invoicing
- **QuotationsModule** — Quote generation, approval workflow, OT conversion
- **InventoryModule** — Stock management, min-stock alerts, weighted average cost

### Supply Chain
- **WmsModule** — Multi-warehouse, locations, stock movements, picking orders
- **SuppliersModule** — Supplier directory, evaluation, payment tracking
- **ImportsModule** — Import orders, landed cost calculation, exchange rates
- **TraceabilityModule** — Full chain: supplier→warehouse→OT→vehicle

### Financial
- **FacturacionModule** — SII Chile electronic invoicing (DTE), XML generation, CAF folios
- **SalesPipelineModule** — Lead tracking, conversion, follow-ups
- **Company360Module** — Company financial overview dashboard

### HR & Admin
- **RrhhModule** — Employees, payroll (Chilean labor law), attendance
- **OnboardingModule** — Step-by-step training for new users
- **ReportsModule** — Custom reports, data exports (CSV/Excel/PDF)
- **BackupModule** — Automated backups, restore, storage monitoring

### Intelligence & Communication
- **DashboardModule** — KPI dashboards, real-time metrics
- **CommandCenterModule** — Centralized operations command center
- **AutomationModule** — Rule-based triggers and actions
- **AuditModule** — Immutable audit trail (blockchain-ready hash chain)
- **ApprovalsModule** — Multi-level approval workflows

### External Portals
- **ExternalPortalModule** — Agent portal for import tracking
- **CustomerPortalModule** — Client self-service portal
- **CompaniesModule** — Multi-company management within tenant

### System
- **HealthModule** — Health checks, readiness probes

---

## 4. FRONTEND PAGES (Next.js 15 App Router)

### Authentication
- `/login` — JWT login with tenant selection
- `/register` — New tenant registration

### Dashboard
- `/dashboard` — Main KPI dashboard (OTs, revenue, inventory alerts)

### Operations
- `/ordenes-trabajo` — Work order management (list, create, detail)
- `/cotizaciones` — Quotation management
- `/vehiculos` — Vehicle registry
- `/clientes` — Client CRM

### Inventory & Supply Chain
- `/inventario` — Stock management
- `/wms` — Warehouse management system
- `/proveedores` — Supplier directory
- `/importaciones` — Import order tracking
- `/trazabilidad` — Part traceability chain

### Financial
- `/facturacion` — Electronic invoicing (SII Chile)
- `/pipeline` — Sales pipeline (kanban board)
- `/cobranza` — Accounts receivable
- `/cuentas-proveedor` — Supplier accounts payable
- `/company-360` — Company financial overview

### HR & Admin
- `/rrhh` — HR management (employees, payroll, attendance)
- `/command-center` — Operations command center
- `/reportes` — Reports and data exports
- `/respaldos` — Backup management

### Portals
- `/portal-externo` — External agent portal
- `/portal-cliente` — Customer self-service

---

## 5. CHILEAN BUSINESS LOGIC

### SII Electronic Invoicing (Facturación Electrónica)
- **DTE Types:** Factura (33), Factura Exenta (34), Boleta (39), Nota Débito (56), Nota Crédito (61), Guía Despacho (52)
- **CAF (Código de Autorización de Folios):** SII assigns folio ranges with RSA keys
- **TED (Timbre Electrónico):** Digital stamp embedded in each DTE
- **XML DTE:** Full XML generation compliant with SII schema
- **Sandbox/Production:** Environment-aware SII integration

### Chilean Payroll (Nómina)
- **AFP (Pension):** HABITAT, PROVIDA, MODELO, CUPRUM, PLANVITAL, CAPITAL, UNO — 10% worker + variable employer
- **Health:** FONASA (public, 7%) or ISAPRE (private, min 7% of UF plan)
- **Gratificación:** Art. 47 (25% of salary) or Art. 50 (4.75 monthly minimum wages capped)
- **Seguro Cesantía:** 0.6% worker + 2.4% employer (indefinido), 3% employer (plazo fijo)
- **Impuesto Único:** Progressive tax on monthly income
- **UF/UTM:** Monthly reference values from Banco Central

### Tax
- **IVA:** 19% standard rate
- **Boleta vs Factura:** Boleta for consumers, Factura for business-to-business

### Currency
- **CLP:** Chilean Peso (primary)
- **UF:** Unidad de Fomento (inflation-indexed, for payroll/real estate)
- **USD/EUR/CNY:** For import operations, daily exchange rates from Banco Central

---

## 6. RBAC (Role-Based Access Control)

| Role | Capabilities |
|------|-------------|
| SUPER_ADMIN | Cross-tenant access, system configuration, bypass RLS |
| OWNER | Full tenant access, billing, user management |
| ADMIN | Manage users, approve quotes, view financials |
| MANAGER | Create/edit OTs, quotes, manage inventory |
| OPERATOR | Work on assigned OTs, update parts, log time |
| VIEWER | Read-only access to dashboards and reports |

---

## 7. API ENDPOINTS PATTERN

All endpoints follow RESTful conventions:
```
GET    /api/{module}              — List (paginated, filterable)
GET    /api/{module}/:id          — Get by ID
POST   /api/{module}              — Create
PATCH  /api/{module}/:id          — Update
DELETE /api/{module}/:id          — Soft delete

GET    /api/{module}/stats        — Module-specific statistics
GET    /api/{module}/dashboard    — Module dashboard data
POST   /api/{module}/:id/actions  — Module-specific actions
```

Authentication: `Authorization: Bearer <JWT>`
Tenant Context: Automatically set from JWT `tenantId` claim
SUPER_ADMIN Targeting: `X-Tenant-Id: <uuid>` header

---

## 8. SECURITY MEASURES

- **RLS (Row-Level Security):** 49 PostgreSQL policies ensuring tenant isolation
- **Parameterized Queries:** All SQL uses `$1, $2` parameters (no string concatenation)
- **JWT + Refresh Tokens:** Short-lived access (15m), long-lived refresh (7d)
- **bcrypt:** Password hashing with salt rounds
- **RBAC Guards:** NestJS guards enforce role-based access
- **Rate Limiting:** Configurable per-endpoint limits
- **CORS:** Whitelist-based origin control
- **Input Validation:** class-validator + class-transformer on all DTOs
- **Audit Trail:** Every mutation logged with user, timestamp, IP, changes

---

## 9. SYNERGY: TORQUE 360 ↔ TRACCIÓN CONSULTORÍAS

TORQUE 360 feeds anonymized, aggregated market intelligence to Tracción Consultorías:

```
TORQUE 360 (talleres, concesionarios, importadoras)
    ↓ Market Intelligence API (anonymized data)
TRACCIÓN Consultorías (consulting based on real data)
    ↓ Recommendations → clients subscribe to TORQUE
    └── Flywheel: more data → better intelligence → better consulting → more TORQUE clients
```

Intelligence data includes:
- Industry benchmarks by segment
- Most repaired vehicle models
- Average repair times
- Parts demand trends
- Revenue per mechanic KPIs
- Seasonal patterns

---

## 10. BLOCKCHAIN-READY ARCHITECTURE

Abstract interfaces in `packages/blockchain-interfaces/`:
- **ILedger** — Append-only ledger (currently PostgreSQL, swap to blockchain later)
- **IAuditTrail** — Tamper-evident audit logging with SHA-256 hash chains
- **ITokenRegistry** — Vehicle history tokens (NFT-like, currently JSON in PostgreSQL)

Current implementation: `PostgresLedger` uses audit_logs table with `prev_hash` → `hash` chain for integrity verification.

---

## 11. KEY BUSINESS RULES

1. **Work Order Status Flow:** PENDING → IN_PROGRESS → WAITING_PARTS → IN_PROGRESS → COMPLETED → INVOICED
2. **Quotation to OT:** Approved quotes automatically create work orders
3. **Inventory Deduction:** Parts are deducted from stock when assigned to OT
4. **Weighted Average Cost:** Inventory cost recalculated on every purchase
5. **Folio Management:** CAF folios auto-increment, alert when 80% consumed
6. **Multi-Currency Imports:** All import costs converted to CLP at daily exchange rate
7. **Landed Cost:** Import cost = FOB + freight + insurance + customs duty + handling
8. **Employee Payroll:** Monthly, auto-calculated Chilean deductions (AFP, Salud, Impuesto)
9. **Backup Retention:** 90-day rolling retention with SHA-256 checksums

---

## 12. DEMO CREDENTIALS

| Email | Password | Role | Tenant |
|-------|----------|------|--------|
| admin@tallerdemo.cl | Demo2024! | OWNER | Taller Demo Santiago |
| jefe@tallerdemo.cl | Demo2024! | ADMIN | Taller Demo Santiago |
| mecanico@tallerdemo.cl | Demo2024! | OPERATOR | Taller Demo Santiago |
| recepcion@tallerdemo.cl | Demo2024! | MANAGER | Taller Demo Santiago |
| viewer@tallerdemo.cl | Demo2024! | VIEWER | Taller Demo Santiago |
| gerente@autoprov.cl | Demo2024! | OWNER | Automotriz Providencia |
| superadmin@torque360.cl | Demo2024! | SUPER_ADMIN | All tenants |

---

## 13. FILE STRUCTURE

```
Torque360/
├── apps/
│   ├── api/                    # NestJS backend (28 modules)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── common/        # Guards, decorators, interceptors
│   │   │   ├── modules/       # 28 business modules
│   │   │   └── database/
│   │   │       ├── entities/  # 44+ TypeORM entities
│   │   │       ├── migrations/# SQL migrations (001-003)
│   │   │       ├── seeds/     # Demo/training data
│   │   │       └── init.sql   # Base schema + RLS
│   │   └── package.json
│   └── web/                    # Next.js 15 frontend
│       ├── src/
│       │   ├── app/           # App Router pages
│       │   ├── components/    # UI components
│       │   └── lib/           # Utilities
│       └── package.json
├── packages/
│   ├── shared/                # Shared types and constants
│   └── blockchain-interfaces/ # Abstract ledger interfaces
├── docker-compose.yml         # PostgreSQL + Redis + Meilisearch
├── turbo.json                 # Turborepo pipeline
└── .env                       # Environment configuration
```
