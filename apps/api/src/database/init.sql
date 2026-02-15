-- TORQUE 360 — Multi-tenant PostgreSQL with RLS
-- Each table has tenant_id, all queries filtered automatically

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants table (no RLS on this one — managed by system)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'starter',
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'OPERATOR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  mfa_secret VARCHAR(255),
  mfa_enabled BOOLEAN NOT NULL DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- Refresh tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vin VARCHAR(17),
  plate VARCHAR(20),
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  color VARCHAR(50),
  engine_type VARCHAR(50),
  transmission VARCHAR(50),
  mileage INTEGER DEFAULT 0,
  client_id UUID,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rut VARCHAR(20),
  type VARCHAR(20) NOT NULL DEFAULT 'individual',
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  company_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Work Orders (Ordenes de Trabajo)
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number SERIAL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  type VARCHAR(50) NOT NULL DEFAULT 'repair',
  priority VARCHAR(20) NOT NULL DEFAULT 'normal',
  description TEXT,
  diagnosis TEXT,
  internal_notes TEXT,
  estimated_hours DECIMAL(10,2),
  actual_hours DECIMAL(10,2),
  labor_cost DECIMAL(12,2) DEFAULT 0,
  parts_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Work Order Parts
CREATE TABLE IF NOT EXISTS work_order_parts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  part_id UUID,
  name VARCHAR(255) NOT NULL,
  part_number VARCHAR(100),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  is_oem BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quotations (Cotizaciones)
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  quote_number SERIAL,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  client_id UUID NOT NULL REFERENCES clients(id),
  created_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  items JSONB NOT NULL DEFAULT '[]',
  subtotal DECIMAL(12,2) DEFAULT 0,
  tax DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) DEFAULT 0,
  valid_until TIMESTAMPTZ,
  notes TEXT,
  work_order_id UUID REFERENCES work_orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inventory (Repuestos)
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sku VARCHAR(100),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  brand VARCHAR(100),
  part_number VARCHAR(100),
  oem_number VARCHAR(100),
  unit VARCHAR(20) DEFAULT 'unit',
  cost_price DECIMAL(12,2) DEFAULT 0,
  sell_price DECIMAL(12,2) DEFAULT 0,
  stock_quantity DECIMAL(10,2) DEFAULT 0,
  min_stock DECIMAL(10,2) DEFAULT 0,
  location VARCHAR(100),
  supplier_id UUID,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Trail (blockchain-ready)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  action VARCHAR(50) NOT NULL,
  changes JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  prev_hash VARCHAR(64),
  hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_clients_tenant ON clients(tenant_id);
CREATE INDEX IF NOT EXISTS idx_clients_rut ON clients(tenant_id, rut);
CREATE INDEX IF NOT EXISTS idx_work_orders_tenant ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(tenant_id, sku);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- RLS Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS helper: set current tenant
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT current_setting('app.current_tenant_id', true)::UUID;
$$ LANGUAGE SQL STABLE;

-- Create RLS policies for each table
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'users', 'vehicles', 'clients', 'work_orders',
    'work_order_parts', 'quotations', 'inventory_items', 'audit_logs'
  ])
  LOOP
    EXECUTE format('
      CREATE POLICY tenant_isolation_%s ON %I
        USING (tenant_id = current_tenant_id())
        WITH CHECK (tenant_id = current_tenant_id());
    ', tbl, tbl);
  END LOOP;
END $$;

-- App user for RLS (not superuser)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'torque_app') THEN
    CREATE ROLE torque_app LOGIN PASSWORD 'torque360_app';
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO torque_app;
GRANT ALL ON ALL TABLES IN SCHEMA public TO torque_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO torque_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO torque_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO torque_app;

-- Seed: demo tenant
INSERT INTO tenants (id, name, slug, plan) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Taller Demo Santiago', 'taller-demo', 'professional')
ON CONFLICT (slug) DO NOTHING;
