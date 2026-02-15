-- TORQUE 360 — Sales Pipeline Enforcement
-- Migration 002
-- Adds pipeline tracking columns to quotations, work_orders, and work_order_parts
-- Enforces: Quotation → Work Order → Dispatch Parts → Invoice (sequential, no skipping)

-- ============================================================
-- QUOTATIONS: Pipeline tracking fields
-- ============================================================

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS invoice_id UUID NULL,
  ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) NOT NULL DEFAULT 'quotation',
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS converted_by UUID NULL;

COMMENT ON COLUMN quotations.pipeline_stage IS 'Pipeline stage: quotation → work_order → dispatched → invoiced';
COMMENT ON COLUMN quotations.invoice_id IS 'FK to invoice created at end of pipeline';
COMMENT ON COLUMN quotations.converted_at IS 'Timestamp when quotation was converted to work order';
COMMENT ON COLUMN quotations.converted_by IS 'User who performed the conversion';

-- ============================================================
-- WORK ORDERS: Pipeline tracking fields
-- ============================================================

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS quotation_id UUID NULL,
  ADD COLUMN IF NOT EXISTS invoice_id UUID NULL,
  ADD COLUMN IF NOT EXISTS parts_dispatched BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS dispatched_by UUID NULL,
  ADD COLUMN IF NOT EXISTS invoiced_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS invoiced_by UUID NULL,
  ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) NOT NULL DEFAULT 'work_order';

COMMENT ON COLUMN work_orders.quotation_id IS 'FK to originating quotation (NULL if WO created directly)';
COMMENT ON COLUMN work_orders.invoice_id IS 'FK to invoice generated from this WO';
COMMENT ON COLUMN work_orders.parts_dispatched IS 'Whether parts have been dispatched from warehouse';
COMMENT ON COLUMN work_orders.dispatched_at IS 'Timestamp of parts dispatch';
COMMENT ON COLUMN work_orders.dispatched_by IS 'User who dispatched parts';
COMMENT ON COLUMN work_orders.invoiced_at IS 'Timestamp of invoicing';
COMMENT ON COLUMN work_orders.invoiced_by IS 'User who generated the invoice';
COMMENT ON COLUMN work_orders.pipeline_stage IS 'Pipeline stage: work_order → dispatched → invoiced';

-- ============================================================
-- WORK ORDER PARTS: Dispatch tracking fields
-- ============================================================

ALTER TABLE work_order_parts
  ADD COLUMN IF NOT EXISTS inventory_item_id UUID NULL,
  ADD COLUMN IF NOT EXISTS warehouse_location_id UUID NULL,
  ADD COLUMN IF NOT EXISTS is_dispatched BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS stock_movement_id UUID NULL;

COMMENT ON COLUMN work_order_parts.inventory_item_id IS 'FK to inventory_items — links part to actual inventory';
COMMENT ON COLUMN work_order_parts.warehouse_location_id IS 'FK to warehouse_locations — where part was dispatched from';
COMMENT ON COLUMN work_order_parts.is_dispatched IS 'Whether this part has been physically dispatched';
COMMENT ON COLUMN work_order_parts.dispatched_at IS 'Timestamp of dispatch';
COMMENT ON COLUMN work_order_parts.stock_movement_id IS 'FK to stock_movements — audit trail for stock deduction';

-- ============================================================
-- INDEXES for pipeline queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_quotations_pipeline_stage
  ON quotations(tenant_id, pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_quotations_invoice_id
  ON quotations(invoice_id) WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_quotation_id
  ON work_orders(quotation_id) WHERE quotation_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_invoice_id
  ON work_orders(invoice_id) WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_pipeline_stage
  ON work_orders(tenant_id, pipeline_stage);

CREATE INDEX IF NOT EXISTS idx_work_orders_parts_dispatched
  ON work_orders(tenant_id, parts_dispatched) WHERE parts_dispatched = false;

CREATE INDEX IF NOT EXISTS idx_work_order_parts_inventory_item
  ON work_order_parts(inventory_item_id) WHERE inventory_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_work_order_parts_dispatched
  ON work_order_parts(work_order_id, is_dispatched);

CREATE INDEX IF NOT EXISTS idx_work_order_parts_stock_movement
  ON work_order_parts(stock_movement_id) WHERE stock_movement_id IS NOT NULL;

-- ============================================================
-- Set pipeline_stage for existing data (backfill)
-- ============================================================

-- Quotations already converted get 'work_order' stage (or further)
UPDATE quotations
SET pipeline_stage = 'work_order'
WHERE status = 'converted'
  AND work_order_id IS NOT NULL
  AND pipeline_stage = 'quotation';

-- Work orders already invoiced get 'invoiced' stage
UPDATE work_orders
SET pipeline_stage = 'invoiced'
WHERE status = 'invoiced'
  AND pipeline_stage = 'work_order';

-- Work orders already completed get their parts_dispatched = true if they have parts
UPDATE work_orders wo
SET parts_dispatched = true,
    pipeline_stage = 'dispatched'
WHERE wo.status IN ('completed', 'invoiced')
  AND EXISTS (
    SELECT 1 FROM work_order_parts wop
    WHERE wop.work_order_id = wo.id
  )
  AND wo.parts_dispatched = false;
