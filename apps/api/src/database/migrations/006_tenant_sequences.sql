-- ============================================================
-- TORQUE 360 — Per-tenant Order Sequences
-- Migration 006 — Replaces global SERIAL with tenant-scoped sequences
-- ============================================================

BEGIN;

-- ─── 1. tenant_sequences table ────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant_sequences (
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sequence_name  VARCHAR(50) NOT NULL,
  current_value  BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, sequence_name)
);

-- ─── 2. Function: get next sequence value (atomic) ────────────

CREATE OR REPLACE FUNCTION next_tenant_sequence(
  p_tenant_id UUID,
  p_sequence_name VARCHAR DEFAULT 'order_number'
) RETURNS BIGINT AS $$
DECLARE
  v_next BIGINT;
BEGIN
  INSERT INTO tenant_sequences (tenant_id, sequence_name, current_value)
  VALUES (p_tenant_id, p_sequence_name, 1)
  ON CONFLICT (tenant_id, sequence_name)
  DO UPDATE SET current_value = tenant_sequences.current_value + 1
  RETURNING current_value INTO v_next;

  RETURN v_next;
END;
$$ LANGUAGE plpgsql;

-- ─── 3. Seed existing tenants with their max order_number ─────

INSERT INTO tenant_sequences (tenant_id, sequence_name, current_value)
SELECT tenant_id, 'order_number', COALESCE(MAX(order_number), 0)
FROM work_orders
GROUP BY tenant_id
ON CONFLICT (tenant_id, sequence_name)
DO UPDATE SET current_value = GREATEST(
  tenant_sequences.current_value,
  EXCLUDED.current_value
);

-- ─── 4. Drop the global SERIAL default ────────────────────────
-- Remove the auto-increment default so the app controls numbering.

ALTER TABLE work_orders
  ALTER COLUMN order_number DROP DEFAULT;

-- Drop the backing sequence if it exists (SERIAL creates one automatically).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class
    WHERE relname = 'work_orders_order_number_seq' AND relkind = 'S'
  ) THEN
    EXECUTE 'DROP SEQUENCE work_orders_order_number_seq CASCADE';
  END IF;
END
$$;

-- ─── 5. RLS ───────────────────────────────────────────────────

ALTER TABLE tenant_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_sequences_isolation ON tenant_sequences
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

COMMIT;
