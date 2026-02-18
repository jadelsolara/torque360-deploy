-- ============================================================
-- TORQUE Network B2B Marketplace
-- Migration 004 — Tables, Indexes, RLS Policies
-- ============================================================

BEGIN;

-- ─── 1. network_listings ────────────────────────────────────

CREATE TABLE IF NOT EXISTS network_listings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_type    VARCHAR(20) NOT NULL CHECK (actor_type IN ('sstt', 'dyp', 'importador')),
  item_type     VARCHAR(20) NOT NULL CHECK (item_type IN ('part', 'service', 'import_offer')),
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  category      VARCHAR(100),
  brand         VARCHAR(100),
  part_number   VARCHAR(100),
  oem_number    VARCHAR(100),
  price         DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency      VARCHAR(3) NOT NULL DEFAULT 'CLP',
  min_quantity  INTEGER NOT NULL DEFAULT 1,
  stock_available INTEGER NOT NULL DEFAULT 0,
  location_city   VARCHAR(100),
  location_region VARCHAR(100),
  is_active     BOOLEAN NOT NULL DEFAULT true,
  views_count   INTEGER NOT NULL DEFAULT 0,
  inquiries_count INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_listings_tenant    ON network_listings(tenant_id);
CREATE INDEX idx_network_listings_actor     ON network_listings(actor_type);
CREATE INDEX idx_network_listings_category  ON network_listings(category);
CREATE INDEX idx_network_listings_brand     ON network_listings(brand);
CREATE INDEX idx_network_listings_part_num  ON network_listings(part_number);
CREATE INDEX idx_network_listings_active    ON network_listings(is_active) WHERE is_active = true;
CREATE INDEX idx_network_listings_price     ON network_listings(price);
CREATE INDEX idx_network_listings_region    ON network_listings(location_region);

ALTER TABLE network_listings ENABLE ROW LEVEL SECURITY;

-- Owners can CRUD their own listings
CREATE POLICY network_listings_tenant_policy ON network_listings
  USING (tenant_id = current_setting('app.current_tenant')::UUID);

-- All authenticated users can view active listings
CREATE POLICY network_listings_read_policy ON network_listings
  FOR SELECT USING (is_active = true);


-- ─── 2. network_rfqs (Request for Quotation) ───────────────

CREATE TABLE IF NOT EXISTS network_rfqs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  items               JSONB NOT NULL DEFAULT '[]',
  target_actor_types  VARCHAR(20)[] NOT NULL DEFAULT '{}',
  target_regions      VARCHAR(100)[] NOT NULL DEFAULT '{}',
  deadline            TIMESTAMPTZ,
  status              VARCHAR(30) NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'closed', 'cancelled', 'awarded')),
  responses_count     INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_rfqs_requester ON network_rfqs(requester_tenant_id);
CREATE INDEX idx_network_rfqs_status    ON network_rfqs(status);
CREATE INDEX idx_network_rfqs_deadline  ON network_rfqs(deadline);

ALTER TABLE network_rfqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY network_rfqs_owner_policy ON network_rfqs
  USING (requester_tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY network_rfqs_read_policy ON network_rfqs
  FOR SELECT USING (status = 'open');


-- ─── 3. network_rfq_responses ───────────────────────────────

CREATE TABLE IF NOT EXISTS network_rfq_responses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id              UUID NOT NULL REFERENCES network_rfqs(id) ON DELETE CASCADE,
  responder_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  items               JSONB NOT NULL DEFAULT '[]',
  total_price         DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_days       INTEGER NOT NULL DEFAULT 0,
  notes               TEXT,
  status              VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_rfq_resp_rfq       ON network_rfq_responses(rfq_id);
CREATE INDEX idx_network_rfq_resp_responder ON network_rfq_responses(responder_tenant_id);
CREATE INDEX idx_network_rfq_resp_status    ON network_rfq_responses(status);

ALTER TABLE network_rfq_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY network_rfq_responses_responder_policy ON network_rfq_responses
  USING (responder_tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY network_rfq_responses_requester_policy ON network_rfq_responses
  FOR SELECT
  USING (
    rfq_id IN (
      SELECT id FROM network_rfqs
      WHERE requester_tenant_id = current_setting('app.current_tenant')::UUID
    )
  );


-- ─── 4. network_transactions ────────────────────────────────

CREATE TABLE IF NOT EXISTS network_transactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  seller_tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  listing_id        UUID REFERENCES network_listings(id) ON DELETE SET NULL,
  rfq_response_id   UUID REFERENCES network_rfq_responses(id) ON DELETE SET NULL,
  items             JSONB NOT NULL DEFAULT '[]',
  subtotal          DECIMAL(12,2) NOT NULL DEFAULT 0,
  commission_rate   DECIMAL(5,4) NOT NULL DEFAULT 0.0300,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total             DECIMAL(12,2) NOT NULL DEFAULT 0,
  status            VARCHAR(30) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled', 'disputed')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_network_tx_buyer   ON network_transactions(buyer_tenant_id);
CREATE INDEX idx_network_tx_seller  ON network_transactions(seller_tenant_id);
CREATE INDEX idx_network_tx_listing ON network_transactions(listing_id);
CREATE INDEX idx_network_tx_status  ON network_transactions(status);

ALTER TABLE network_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY network_transactions_buyer_policy ON network_transactions
  USING (buyer_tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY network_transactions_seller_policy ON network_transactions
  USING (seller_tenant_id = current_setting('app.current_tenant')::UUID);


-- ─── 5. network_ratings ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS network_ratings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id    UUID NOT NULL REFERENCES network_transactions(id) ON DELETE CASCADE,
  rater_tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  rated_tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  score             SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  delivery_score    SMALLINT CHECK (delivery_score BETWEEN 1 AND 5),
  quality_score     SMALLINT CHECK (quality_score BETWEEN 1 AND 5),
  communication_score SMALLINT CHECK (communication_score BETWEEN 1 AND 5),
  comment           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_rating_per_transaction_rater UNIQUE (transaction_id, rater_tenant_id)
);

CREATE INDEX idx_network_ratings_tx     ON network_ratings(transaction_id);
CREATE INDEX idx_network_ratings_rater  ON network_ratings(rater_tenant_id);
CREATE INDEX idx_network_ratings_rated  ON network_ratings(rated_tenant_id);

ALTER TABLE network_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY network_ratings_rater_policy ON network_ratings
  USING (rater_tenant_id = current_setting('app.current_tenant')::UUID);

CREATE POLICY network_ratings_read_policy ON network_ratings
  FOR SELECT USING (true);


-- ─── Trigger: auto-update updated_at on listings ────────────

CREATE OR REPLACE FUNCTION update_network_listings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_network_listings_updated_at
  BEFORE UPDATE ON network_listings
  FOR EACH ROW EXECUTE FUNCTION update_network_listings_updated_at();


COMMIT;
