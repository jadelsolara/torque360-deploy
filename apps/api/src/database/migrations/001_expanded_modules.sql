-- TORQUE 360 — Expanded Modules: WMS, Importadoras, Trazabilidad, Multi-user per RUT
-- Migration 001

-- ============================================================
-- MULTI-USER PER CLIENT (RUT EMPRESA)
-- 1 empresa (RUT) → N usuarios con roles distintos
-- ============================================================

CREATE TABLE IF NOT EXISTS client_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  position VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'contact',
  is_primary BOOLEAN DEFAULT false,
  can_approve_quotes BOOLEAN DEFAULT false,
  can_authorize_work BOOLEAN DEFAULT false,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Client portal access (empresa users login to see their vehicles/OTs)
CREATE TABLE IF NOT EXISTS client_portal_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES client_contacts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  portal_role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ============================================================
-- WMS — Warehouse Management System
-- Multi-bodega, ubicaciones, picking, recepción, despacho
-- ============================================================

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  address TEXT,
  city VARCHAR(100),
  region VARCHAR(100),
  type VARCHAR(50) NOT NULL DEFAULT 'main',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  zone VARCHAR(50),
  aisle VARCHAR(20),
  rack VARCHAR(20),
  shelf VARCHAR(20),
  bin VARCHAR(20),
  capacity DECIMAL(10,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(warehouse_id, code)
);

-- Stock per location (inventory_items stock distributed across locations)
CREATE TABLE IF NOT EXISTS stock_locations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  location_id UUID REFERENCES warehouse_locations(id),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  lot_number VARCHAR(100),
  expiry_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stock movements (every in/out)
CREATE TABLE IF NOT EXISTS stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  from_warehouse_id UUID REFERENCES warehouses(id),
  from_location_id UUID REFERENCES warehouse_locations(id),
  to_warehouse_id UUID REFERENCES warehouses(id),
  to_location_id UUID REFERENCES warehouse_locations(id),
  movement_type VARCHAR(50) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  reference_type VARCHAR(50),
  reference_id UUID,
  reason TEXT,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Picking orders
CREATE TABLE IF NOT EXISTS picking_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number SERIAL,
  work_order_id UUID REFERENCES work_orders(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  assigned_to UUID REFERENCES users(id),
  priority VARCHAR(20) DEFAULT 'normal',
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS picking_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  picking_order_id UUID NOT NULL REFERENCES picking_orders(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  location_id UUID REFERENCES warehouse_locations(id),
  requested_qty DECIMAL(10,2) NOT NULL,
  picked_qty DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goods receipt (recepción de mercadería)
CREATE TABLE IF NOT EXISTS goods_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_number SERIAL,
  supplier_id UUID,
  purchase_order_id UUID,
  import_order_id UUID,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  received_by UUID REFERENCES users(id),
  notes TEXT,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goods_receipt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  receipt_id UUID NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  location_id UUID REFERENCES warehouse_locations(id),
  expected_qty DECIMAL(10,2) NOT NULL,
  received_qty DECIMAL(10,2) DEFAULT 0,
  rejected_qty DECIMAL(10,2) DEFAULT 0,
  lot_number VARCHAR(100),
  expiry_date DATE,
  unit_cost DECIMAL(12,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- IMPORTADORAS — Ordenes de importación, LC, embarques, costos
-- ============================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  rut VARCHAR(20),
  country VARCHAR(100),
  contact_name VARCHAR(200),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  payment_terms VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'USD',
  rating DECIMAL(3,2),
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_number SERIAL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  incoterm VARCHAR(10) DEFAULT 'FOB',
  origin_country VARCHAR(100),
  origin_port VARCHAR(200),
  destination_port VARCHAR(200) DEFAULT 'Valparaíso',
  currency VARCHAR(10) DEFAULT 'USD',
  exchange_rate DECIMAL(10,4),
  fob_total DECIMAL(14,2) DEFAULT 0,
  freight_cost DECIMAL(12,2) DEFAULT 0,
  insurance_cost DECIMAL(12,2) DEFAULT 0,
  cif_total DECIMAL(14,2) DEFAULT 0,
  customs_duty DECIMAL(12,2) DEFAULT 0,
  customs_tax DECIMAL(12,2) DEFAULT 0,
  other_costs DECIMAL(12,2) DEFAULT 0,
  landed_cost_total DECIMAL(14,2) DEFAULT 0,
  lc_number VARCHAR(100),
  lc_bank VARCHAR(200),
  lc_amount DECIMAL(14,2),
  lc_expiry DATE,
  bl_number VARCHAR(100),
  container_number VARCHAR(50),
  vessel_name VARCHAR(200),
  etd DATE,
  eta DATE,
  actual_arrival DATE,
  customs_clearance_date DATE,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS import_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  import_order_id UUID NOT NULL REFERENCES import_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id),
  description VARCHAR(500) NOT NULL,
  hs_code VARCHAR(20),
  quantity DECIMAL(10,2) NOT NULL,
  unit_price DECIMAL(12,4) NOT NULL,
  total_price DECIMAL(14,2) NOT NULL,
  weight_kg DECIMAL(10,2),
  volume_cbm DECIMAL(10,4),
  landed_unit_cost DECIMAL(12,4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TRAZABILIDAD — Cadena completa proveedor → bodega → OT → vehículo
-- ============================================================

CREATE TABLE IF NOT EXISTS traceability_chain (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id),
  lot_number VARCHAR(100),
  serial_number VARCHAR(100),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB DEFAULT '{}',
  reference_type VARCHAR(50),
  reference_id UUID,
  location VARCHAR(255),
  performed_by UUID REFERENCES users(id),
  prev_hash VARCHAR(64),
  hash VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vehicle service history (trazabilidad de servicios por vehículo)
CREATE TABLE IF NOT EXISTS vehicle_service_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id),
  service_type VARCHAR(50) NOT NULL,
  description TEXT,
  mileage INTEGER,
  work_order_id UUID REFERENCES work_orders(id),
  parts_used JSONB DEFAULT '[]',
  technician_id UUID REFERENCES users(id),
  cost DECIMAL(12,2) DEFAULT 0,
  warranty_until DATE,
  notes TEXT,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON client_contacts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_contacts_tenant ON client_contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_portal_users_client ON client_portal_users(client_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_item ON stock_locations(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_warehouse ON stock_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tenant ON stock_movements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_picking_orders_tenant ON picking_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_orders_tenant ON import_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_orders_supplier ON import_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_traceability_item ON traceability_chain(item_id);
CREATE INDEX IF NOT EXISTS idx_traceability_tenant ON traceability_chain(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_history_vehicle ON vehicle_service_history(vehicle_id);

-- ============================================================
-- RLS on new tables
-- ============================================================
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE picking_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE traceability_chain ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_service_history ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'client_contacts', 'client_portal_users',
    'warehouses', 'warehouse_locations', 'stock_locations', 'stock_movements',
    'picking_orders', 'picking_order_items',
    'goods_receipts', 'goods_receipt_items',
    'suppliers', 'import_orders', 'import_order_items',
    'traceability_chain', 'vehicle_service_history'
  ])
  LOOP
    EXECUTE format('
      CREATE POLICY tenant_isolation_%s ON %I
        USING (tenant_id = current_tenant_id())
        WITH CHECK (tenant_id = current_tenant_id());
    ', tbl, tbl);
  END LOOP;
END $$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO torque_app;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO torque_app;
