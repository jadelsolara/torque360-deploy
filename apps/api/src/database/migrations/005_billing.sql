-- ============================================================
-- TORQUE 360 — Billing & Subscriptions
-- Migration 005 — Tables, Indexes, RLS Policies
-- ============================================================

BEGIN;

-- ─── 1. subscriptions ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan                      VARCHAR(20) NOT NULL DEFAULT 'starter',
  status                    VARCHAR(20) NOT NULL DEFAULT 'active',
  provider                  VARCHAR(20) NOT NULL,
  provider_customer_id      VARCHAR(255),
  provider_subscription_id  VARCHAR(255),
  current_period_start      TIMESTAMPTZ,
  current_period_end        TIMESTAMPTZ,
  cancel_at_period_end      BOOLEAN NOT NULL DEFAULT false,
  amount                    DECIMAL(14,2) NOT NULL DEFAULT 0,
  currency                  VARCHAR(3) NOT NULL DEFAULT 'CLP',
  metadata                  JSONB NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One active subscription per tenant
CREATE UNIQUE INDEX IF NOT EXISTS uq_subscriptions_tenant
  ON subscriptions (tenant_id);

-- Lookup by provider subscription id (webhook reconciliation)
CREATE INDEX IF NOT EXISTS idx_subscriptions_provider_sub_id
  ON subscriptions (provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_subscriptions_status
  ON subscriptions (status);

-- ─── 2. RLS ───────────────────────────────────────────────────

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_tenant_isolation ON subscriptions
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- ─── 3. Updated-at trigger ────────────────────────────────────

CREATE TRIGGER set_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ─── 4. Add plan column to tenants if missing ─────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'plan'
  ) THEN
    ALTER TABLE tenants ADD COLUMN plan VARCHAR(20) NOT NULL DEFAULT 'starter';
  END IF;
END
$$;

COMMIT;
