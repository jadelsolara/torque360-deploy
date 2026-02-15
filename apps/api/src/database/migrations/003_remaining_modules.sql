-- ============================================================================
-- TORQUE 360 — Migration 003: Remaining Modules
-- Creates all 26 tables for: Facturacion, RRHH, CxP, CxC, Portal, Ops, System
-- ============================================================================

BEGIN;

-- ════════════════════════════════════════════════════════════════════════════
-- ENUM TYPES (used by backup_records and storage_metrics)
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE backup_type AS ENUM ('FULL', 'INCREMENTAL', 'DIFFERENTIAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE storage_target AS ENUM ('LOCAL', 'R2_CLOUD', 'BOTH');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE backup_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE backup_trigger AS ENUM ('SCHEDULED', 'MANUAL', 'AUTO_SCALE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE alert_level AS ENUM ('NORMAL', 'WARNING', 'CRITICAL', 'EXCEEDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ════════════════════════════════════════════════════════════════════════════
-- 1. COMPANIES (Company 360)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rut VARCHAR(20) UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  trade_name VARCHAR(255),
  industry VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  parent_company_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 2. EXCHANGE RATES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  currency VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  buy_rate DECIMAL(14,4),
  sell_rate DECIMAL(14,4),
  observed_rate DECIMAL(14,4) NOT NULL,
  source VARCHAR(20) DEFAULT 'API',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(currency, date)
);

-- ════════════════════════════════════════════════════════════════════════════
-- 3. APPROVALS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  approval_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  requested_by UUID NOT NULL,
  required_role VARCHAR(50) NOT NULL,
  assigned_to UUID,
  decided_by UUID,
  description TEXT,
  context JSONB DEFAULT '{}',
  reason TEXT,
  decided_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 4. NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  channel VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(100),
  entity_id UUID,
  action_url VARCHAR(500),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 5. AUTOMATION RULES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(50) NOT NULL,
  trigger_entity VARCHAR(100) NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  action_type VARCHAR(50) NOT NULL,
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 6. INVOICES (Facturacion Electronica SII Chile)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- DTE Identification
  dte_type SMALLINT NOT NULL,
  folio INTEGER NOT NULL,
  issue_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- Emisor
  emisor_rut VARCHAR(12) NOT NULL,
  emisor_razon_social VARCHAR(255) NOT NULL,
  emisor_giro VARCHAR(255) NOT NULL,
  emisor_direccion VARCHAR(255) NOT NULL,
  emisor_comuna VARCHAR(100) NOT NULL,
  emisor_ciudad VARCHAR(100) NOT NULL,
  emisor_actividad_economica INTEGER,
  -- Receptor
  receptor_rut VARCHAR(12) NOT NULL,
  receptor_razon_social VARCHAR(255) NOT NULL,
  receptor_giro VARCHAR(255),
  receptor_direccion VARCHAR(255),
  receptor_comuna VARCHAR(100),
  receptor_ciudad VARCHAR(100),
  receptor_contacto VARCHAR(255),
  -- Montos
  monto_neto DECIMAL(14,2) DEFAULT 0,
  monto_exento DECIMAL(14,2) DEFAULT 0,
  tasa_iva DECIMAL(5,2) DEFAULT 19,
  iva DECIMAL(14,2) DEFAULT 0,
  monto_total DECIMAL(14,2) DEFAULT 0,
  -- Referencia (Notas de Credito/Debito)
  ref_dte_type SMALLINT,
  ref_folio INTEGER,
  ref_fecha DATE,
  ref_razon VARCHAR(255),
  ref_codigo SMALLINT,
  -- Relaciones TORQUE
  client_id UUID,
  work_order_id UUID,
  quotation_id UUID,
  -- SII Integration
  sii_track_id VARCHAR(100),
  sii_status VARCHAR(50),
  sii_response JSONB,
  timbre_electronico TEXT,
  xml_dte TEXT,
  pdf_url VARCHAR(500),
  -- Metadata
  created_by UUID NOT NULL,
  notes TEXT,
  payment_method VARCHAR(50),
  payment_condition VARCHAR(50),
  due_date DATE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 7. INVOICE ITEMS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number SMALLINT NOT NULL,
  item_code VARCHAR(50),
  item_name VARCHAR(255) NOT NULL,
  item_description TEXT,
  quantity DECIMAL(14,4) DEFAULT 1,
  unit_measure VARCHAR(20),
  unit_price DECIMAL(14,2) NOT NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  surcharge_pct DECIMAL(5,2) DEFAULT 0,
  surcharge_amount DECIMAL(14,2) DEFAULT 0,
  is_exempt BOOLEAN NOT NULL DEFAULT false,
  total_line DECIMAL(14,2) NOT NULL,
  inventory_item_id UUID,
  work_order_part_id UUID
);

-- ════════════════════════════════════════════════════════════════════════════
-- 8. CAF FOLIOS (SII)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS caf_folios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dte_type SMALLINT NOT NULL,
  folio_from INTEGER NOT NULL,
  folio_to INTEGER NOT NULL,
  current_folio INTEGER NOT NULL,
  caf_xml TEXT NOT NULL,
  private_key TEXT,
  expiration_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_exhausted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 9. EMPLOYEES (RRHH — Chilean Labor Law)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  -- Personal
  rut VARCHAR(20) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  birth_date DATE,
  gender VARCHAR(20),
  nationality VARCHAR(60) DEFAULT 'Chilena',
  marital_status VARCHAR(30),
  address TEXT,
  comuna VARCHAR(100),
  city VARCHAR(100),
  phone VARCHAR(50),
  personal_email VARCHAR(255),
  -- Employment
  employee_code VARCHAR(30),
  hire_date DATE NOT NULL,
  termination_date DATE,
  contract_type VARCHAR(30) DEFAULT 'INDEFINIDO',
  position VARCHAR(100),
  department VARCHAR(100),
  work_schedule VARCHAR(20) DEFAULT 'FULL_TIME',
  weekly_hours INTEGER DEFAULT 45,
  -- Compensation
  base_salary DECIMAL(14,2) DEFAULT 0,
  gratification_type VARCHAR(20) DEFAULT 'ARTICULO_47',
  colacion_amount DECIMAL(14,2) DEFAULT 0,
  movilizacion_amount DECIMAL(14,2) DEFAULT 0,
  -- Health
  health_system VARCHAR(20) DEFAULT 'FONASA',
  isapre VARCHAR(60),
  isapre_code VARCHAR(20),
  isapre_plan_uf DECIMAL(10,4) DEFAULT 0,
  fonasa_tramo VARCHAR(5),
  -- Pension
  afp_name VARCHAR(30),
  afp_code VARCHAR(20),
  afp_rate DECIMAL(6,2) DEFAULT 0,
  is_afp_voluntary BOOLEAN NOT NULL DEFAULT false,
  voluntary_afp_amount DECIMAL(14,2) DEFAULT 0,
  -- Other
  seguro_cesantia_type VARCHAR(30),
  apv_amount DECIMAL(14,2) DEFAULT 0,
  family_allowance_tramo VARCHAR(5),
  number_of_dependents INTEGER DEFAULT 0,
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 10. PAYROLLS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,
  status VARCHAR(20) DEFAULT 'DRAFT',
  total_haberes DECIMAL(14,2) DEFAULT 0,
  total_descuentos DECIMAL(14,2) DEFAULT 0,
  total_liquido DECIMAL(14,2) DEFAULT 0,
  total_costo_empresa DECIMAL(14,2) DEFAULT 0,
  employee_count INTEGER DEFAULT 0,
  uf_value DECIMAL(10,4) DEFAULT 0,
  utm_value DECIMAL(10,2) DEFAULT 0,
  ingreso_minimo DECIMAL(14,2) DEFAULT 0,
  calculated_at TIMESTAMPTZ,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 11. PAYROLL DETAILS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payroll_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  -- Haberes (Earnings)
  sueldo_base DECIMAL(14,2) DEFAULT 0,
  gratificacion DECIMAL(14,2) DEFAULT 0,
  horas_extra INTEGER DEFAULT 0,
  monto_horas_extra DECIMAL(14,2) DEFAULT 0,
  bonos DECIMAL(14,2) DEFAULT 0,
  comisiones DECIMAL(14,2) DEFAULT 0,
  colacion DECIMAL(14,2) DEFAULT 0,
  movilizacion DECIMAL(14,2) DEFAULT 0,
  otros_haberes DECIMAL(14,2) DEFAULT 0,
  total_imponible DECIMAL(14,2) DEFAULT 0,
  total_no_imponible DECIMAL(14,2) DEFAULT 0,
  total_haberes DECIMAL(14,2) DEFAULT 0,
  -- Descuentos Legales
  afp_rate DECIMAL(6,2) DEFAULT 0,
  afp_amount DECIMAL(14,2) DEFAULT 0,
  salud_rate DECIMAL(6,2) DEFAULT 0,
  salud_amount DECIMAL(14,2) DEFAULT 0,
  salud_adicional_isapre DECIMAL(14,2) DEFAULT 0,
  seguro_cesantia_rate DECIMAL(6,2) DEFAULT 0,
  seguro_cesantia_amount DECIMAL(14,2) DEFAULT 0,
  impuesto_unico DECIMAL(14,2) DEFAULT 0,
  -- Descuentos Voluntarios
  apv_amount DECIMAL(14,2) DEFAULT 0,
  anticipos DECIMAL(14,2) DEFAULT 0,
  prestamos DECIMAL(14,2) DEFAULT 0,
  otros_descuentos DECIMAL(14,2) DEFAULT 0,
  total_descuentos DECIMAL(14,2) DEFAULT 0,
  -- Aportes Empleador
  seguro_cesantia_empleador DECIMAL(14,2) DEFAULT 0,
  sis DECIMAL(14,2) DEFAULT 0,
  mutualidad DECIMAL(14,2) DEFAULT 0,
  total_costo_empleador DECIMAL(14,2) DEFAULT 0,
  -- Result
  sueldo_liquido DECIMAL(14,2) DEFAULT 0,
  costo_total_empresa DECIMAL(14,2) DEFAULT 0,
  -- Metadata
  days_worked INTEGER DEFAULT 30,
  days_absent INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 12. ATTENDANCE
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id),
  date DATE NOT NULL,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  hours_worked DECIMAL(5,2) DEFAULT 0,
  type VARCHAR(30) DEFAULT 'NORMAL',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 13. EXTERNAL ACCESSES (Import Agent Portal)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS external_accesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  agent_type VARCHAR(50) NOT NULL,
  agent_name VARCHAR(255) NOT NULL,
  agent_email VARCHAR(255) NOT NULL,
  agent_phone VARCHAR(50),
  token_hash VARCHAR(255) NOT NULL,
  permissions JSONB DEFAULT '{"canUpdateStatus":false,"canUploadDocuments":false,"canUpdateDates":false,"canUpdateCosts":false,"allowedStatusTransitions":[],"allowedFields":[]}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ NOT NULL,
  last_access_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 14. IMPORT UPDATE LOGS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS import_update_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  external_access_id UUID REFERENCES external_accesses(id),
  user_id UUID,
  source VARCHAR(20) DEFAULT 'INTERNAL',
  agent_type VARCHAR(50),
  agent_name VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  note TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 15. SUPPLIER INVOICES (Cuentas por Pagar)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  invoice_number VARCHAR(100) NOT NULL,
  invoice_type VARCHAR(30) DEFAULT 'FACTURA_COMPRA',
  dte_type SMALLINT,
  -- Dates
  issue_date DATE NOT NULL,
  reception_date DATE,
  due_date DATE,
  -- Amounts
  monto_neto DECIMAL(14,2) DEFAULT 0,
  monto_exento DECIMAL(14,2) DEFAULT 0,
  iva DECIMAL(14,2) DEFAULT 0,
  monto_total DECIMAL(14,2) DEFAULT 0,
  -- Currency
  currency VARCHAR(10) DEFAULT 'CLP',
  exchange_rate DECIMAL(14,4),
  monto_total_clp DECIMAL(14,2),
  -- Payment
  payment_condition VARCHAR(20) DEFAULT 'CONTADO',
  status VARCHAR(20) DEFAULT 'RECEIVED',
  paid_amount DECIMAL(14,2) DEFAULT 0,
  pending_amount DECIMAL(14,2) DEFAULT 0,
  -- Related
  related_import_order_id UUID,
  related_purchase_order_id UUID,
  sii_track_id VARCHAR(100),
  -- Metadata
  notes TEXT,
  document_url VARCHAR(500),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 16. SUPPLIER INVOICE ITEMS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
  inventory_item_id UUID,
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(14,4) DEFAULT 1,
  unit_price DECIMAL(14,2) DEFAULT 0,
  total_line DECIMAL(14,2) DEFAULT 0,
  is_exempt BOOLEAN NOT NULL DEFAULT false
);

-- ════════════════════════════════════════════════════════════════════════════
-- 17. SUPPLIER PAYMENTS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supplier_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  supplier_invoice_id UUID REFERENCES supplier_invoices(id),
  payment_number VARCHAR(20) NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'CLP',
  exchange_rate DECIMAL(14,4),
  amount_clp DECIMAL(14,2),
  payment_method VARCHAR(20) DEFAULT 'TRANSFERENCIA',
  -- Bank details
  bank_name VARCHAR(100),
  account_number VARCHAR(50),
  transaction_ref VARCHAR(100),
  -- Cheque details
  cheque_number VARCHAR(50),
  cheque_date DATE,
  cheque_bank_name VARCHAR(100),
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING',
  -- Metadata
  notes TEXT,
  receipt_url VARCHAR(500),
  created_by UUID,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 18. CLIENT PAYMENTS (Cuentas por Cobrar)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS client_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  payment_number VARCHAR(20) NOT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(20) DEFAULT 'TRANSFERENCIA',
  -- Bank details
  bank_name VARCHAR(100),
  transaction_ref VARCHAR(100),
  cheque_number VARCHAR(50),
  -- Status
  status VARCHAR(20) DEFAULT 'PENDING',
  -- Metadata
  notes TEXT,
  receipt_url VARCHAR(500),
  created_by UUID,
  confirmed_by UUID,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 19. CUSTOMER TICKETS (Portal Cliente)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  work_order_id UUID,
  vehicle_id UUID,
  ticket_number VARCHAR(20) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  category VARCHAR(30) DEFAULT 'GENERAL',
  priority VARCHAR(10) DEFAULT 'MEDIUM',
  status VARCHAR(20) DEFAULT 'OPEN',
  is_paid_report BOOLEAN NOT NULL DEFAULT false,
  report_amount DECIMAL(14,2),
  report_url TEXT,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 20. CUSTOMER MESSAGES
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES customer_tickets(id) ON DELETE CASCADE,
  sender_type VARCHAR(10) NOT NULL,
  sender_id UUID NOT NULL,
  sender_name VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 21. CUSTOMER ACCESSES (Portal Auth)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS customer_accesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  access_code VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 22. ONBOARDING PROGRESS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,
  module_id VARCHAR(100) NOT NULL,
  step_id VARCHAR(100) NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  skipped BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, user_id, module_id, step_id)
);

-- ════════════════════════════════════════════════════════════════════════════
-- 23. REPORT REQUESTS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS report_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  report_type VARCHAR(30) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  scope JSONB DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'PENDING',
  amount DECIMAL(12,2) DEFAULT 0,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(255),
  report_url VARCHAR(500),
  ai_analysis TEXT,
  generated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 24. DATA EXPORTS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS data_exports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL,
  export_type VARCHAR(10) NOT NULL,
  module VARCHAR(50) NOT NULL,
  filters JSONB,
  status VARCHAR(20) DEFAULT 'PENDING',
  file_url VARCHAR(500),
  file_size_bytes INTEGER,
  row_count INTEGER,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 25. BACKUP RECORDS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS backup_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID,
  backup_type backup_type NOT NULL,
  storage_target storage_target NOT NULL,
  status backup_status NOT NULL DEFAULT 'PENDING',
  local_path VARCHAR(500),
  cloud_url VARCHAR(500),
  cloud_bucket VARCHAR(255),
  size_bytes BIGINT DEFAULT 0,
  tables_included JSONB DEFAULT '[]',
  row_counts JSONB DEFAULT '{}',
  checksum_sha256 VARCHAR(64),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  error_message TEXT,
  triggered_by backup_trigger NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- 26. STORAGE METRICS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS storage_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  measured_at TIMESTAMPTZ NOT NULL,
  db_size_bytes BIGINT DEFAULT 0,
  file_size_bytes BIGINT DEFAULT 0,
  backup_size_bytes BIGINT DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,
  row_count_total INTEGER DEFAULT 0,
  quota_bytes BIGINT DEFAULT 0,
  usage_percent DECIMAL(5,2) DEFAULT 0,
  alert_level alert_level NOT NULL DEFAULT 'NORMAL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ════════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════════════════════

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_tenant ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_companies_rut ON companies(rut);

-- Exchange rates
CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_date ON exchange_rates(currency, date);

-- Approvals
CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(tenant_id, status);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_user ON notifications(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, user_id, is_read) WHERE is_read = false;

-- Automation rules
CREATE INDEX IF NOT EXISTS idx_automation_tenant ON automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_active ON automation_rules(tenant_id, is_active) WHERE is_active = true;

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_folio ON invoices(tenant_id, dte_type, folio);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_dates ON invoices(tenant_id, issue_date);

-- Invoice items
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_tenant ON invoice_items(tenant_id);

-- CAF Folios
CREATE INDEX IF NOT EXISTS idx_caf_folios_tenant_dte ON caf_folios(tenant_id, dte_type);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_rut ON employees(tenant_id, rut);

-- Payrolls
CREATE INDEX IF NOT EXISTS idx_payrolls_tenant ON payrolls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_period ON payrolls(tenant_id, period);

-- Payroll details
CREATE INDEX IF NOT EXISTS idx_payroll_details_payroll ON payroll_details(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_employee ON payroll_details(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_details_tenant ON payroll_details(tenant_id);

-- Attendance
CREATE INDEX IF NOT EXISTS idx_attendance_tenant ON attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);

-- External accesses
CREATE INDEX IF NOT EXISTS idx_external_accesses_tenant ON external_accesses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_external_accesses_import ON external_accesses(import_order_id);
CREATE INDEX IF NOT EXISTS idx_external_accesses_token ON external_accesses(token_hash);

-- Import update logs
CREATE INDEX IF NOT EXISTS idx_import_update_logs_order ON import_update_logs(import_order_id);
CREATE INDEX IF NOT EXISTS idx_import_update_logs_tenant ON import_update_logs(tenant_id);

-- Supplier invoices
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_tenant ON supplier_invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_due ON supplier_invoices(tenant_id, due_date) WHERE status NOT IN ('PAID', 'VOIDED');
CREATE INDEX IF NOT EXISTS idx_supplier_invoices_status ON supplier_invoices(tenant_id, status);

-- Supplier invoice items
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice ON supplier_invoice_items(supplier_invoice_id);
CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_tenant ON supplier_invoice_items(tenant_id);

-- Supplier payments
CREATE INDEX IF NOT EXISTS idx_supplier_payments_tenant ON supplier_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_supplier ON supplier_payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payments_invoice ON supplier_payments(supplier_invoice_id);

-- Client payments
CREATE INDEX IF NOT EXISTS idx_client_payments_tenant ON client_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_client ON client_payments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_payments_invoice ON client_payments(invoice_id);

-- Customer tickets
CREATE INDEX IF NOT EXISTS idx_customer_tickets_tenant ON customer_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_tickets_client ON customer_tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_customer_tickets_status ON customer_tickets(tenant_id, status);

-- Customer messages
CREATE INDEX IF NOT EXISTS idx_customer_messages_ticket ON customer_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_customer_messages_tenant ON customer_messages(tenant_id);

-- Customer accesses
CREATE INDEX IF NOT EXISTS idx_customer_accesses_tenant ON customer_accesses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_accesses_email ON customer_accesses(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_customer_accesses_client ON customer_accesses(client_id);

-- Onboarding
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON onboarding_progress(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_user ON onboarding_progress(user_id);

-- Report requests
CREATE INDEX IF NOT EXISTS idx_report_requests_tenant ON report_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_requests_status ON report_requests(tenant_id, status);

-- Data exports
CREATE INDEX IF NOT EXISTS idx_data_exports_tenant ON data_exports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_exports_status ON data_exports(tenant_id, status);

-- Backup records
CREATE INDEX IF NOT EXISTS idx_backup_records_tenant ON backup_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backup_records_status ON backup_records(status);

-- Storage metrics
CREATE INDEX IF NOT EXISTS idx_storage_metrics_tenant ON storage_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_storage_metrics_measured ON storage_metrics(measured_at);


-- ════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE caf_folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_update_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_accesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for all new tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'companies', 'approvals', 'notifications', 'automation_rules',
    'invoices', 'invoice_items', 'caf_folios',
    'employees', 'payrolls', 'payroll_details', 'attendance',
    'external_accesses', 'import_update_logs',
    'supplier_invoices', 'supplier_invoice_items', 'supplier_payments',
    'client_payments',
    'customer_tickets', 'customer_messages', 'customer_accesses',
    'onboarding_progress', 'report_requests', 'data_exports',
    'storage_metrics'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%s ON %I', tbl, tbl);
    EXECUTE format('
      CREATE POLICY tenant_isolation_%s ON %I
        USING (tenant_id = current_tenant_id())
        WITH CHECK (tenant_id = current_tenant_id())
    ', tbl, tbl);
  END LOOP;
END $$;

-- backup_records has nullable tenant_id (system-wide backups)
DROP POLICY IF EXISTS tenant_isolation_backup_records ON backup_records;
CREATE POLICY tenant_isolation_backup_records ON backup_records
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id())
  WITH CHECK (tenant_id IS NULL OR tenant_id = current_tenant_id());
ALTER TABLE backup_records ENABLE ROW LEVEL SECURITY;

-- exchange_rates has nullable tenant_id (global rates)
DROP POLICY IF EXISTS tenant_isolation_exchange_rates ON exchange_rates;
CREATE POLICY tenant_isolation_exchange_rates ON exchange_rates
  USING (tenant_id IS NULL OR tenant_id = current_tenant_id())
  WITH CHECK (tenant_id IS NULL OR tenant_id = current_tenant_id());
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Grant to app user (ignore if role doesn't exist yet)
DO $$
BEGIN
  EXECUTE 'GRANT ALL ON ALL TABLES IN SCHEMA public TO torque_app';
  EXECUTE 'GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO torque_app';
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Role torque_app does not exist, skipping grants';
END $$;

COMMIT;
