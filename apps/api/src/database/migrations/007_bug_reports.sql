-- 007: Bug Reports table
-- Stores user-reported bugs from the frontend widget

CREATE TABLE IF NOT EXISTS bug_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  user_label    VARCHAR(200),
  description   TEXT NOT NULL,
  severity      VARCHAR(20) NOT NULL DEFAULT 'medium',
  section       VARCHAR(255) NOT NULL,
  url           VARCHAR(500),
  viewport      VARCHAR(30),
  user_agent    VARCHAR(200),
  browser_lang  VARCHAR(10),
  js_errors     JSONB,
  status        VARCHAR(20) NOT NULL DEFAULT 'new',
  content_hash  VARCHAR(64) NOT NULL,
  project       VARCHAR(100),
  resolved_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at   TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite indexes for common queries
CREATE INDEX idx_bug_reports_tenant_status ON bug_reports(tenant_id, status);
CREATE INDEX idx_bug_reports_tenant_severity ON bug_reports(tenant_id, severity);
CREATE UNIQUE INDEX idx_bug_reports_tenant_hash ON bug_reports(tenant_id, content_hash);
CREATE INDEX idx_bug_reports_created ON bug_reports(tenant_id, created_at DESC);

-- Severity check
ALTER TABLE bug_reports ADD CONSTRAINT chk_bug_severity
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

-- Status check
ALTER TABLE bug_reports ADD CONSTRAINT chk_bug_status
  CHECK (status IN ('new', 'viewed', 'in_progress', 'fixed', 'dismissed'));
