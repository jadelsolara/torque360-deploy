/**
 * TORQUE 360 — Dashboard & Reporting Stress Test
 *
 * Tests: Stats, KPIs, recent activity, Company360, audit, notifications
 * These are the heaviest read endpoints (aggregations, JOINs, GROUP BYs)
 * Run: k6 run test/k6/dashboard-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { BASE_URL, LOAD_STAGES, THRESHOLDS, authHeaders, jsonHeaders } from './config.js';

const statsDuration = new Trend('dashboard_stats_duration', true);
const kpiDuration = new Trend('kpi_duration', true);
const company360Duration = new Trend('company360_duration', true);
const auditDuration = new Trend('audit_list_duration', true);
const dashErrors = new Counter('dashboard_errors');

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    dashboard_stats_duration: ['p(95)<800'],
    kpi_duration: ['p(95)<1000'],
    company360_duration: ['p(95)<1200'],
    audit_list_duration: ['p(95)<600'],
  },
};

export function setup() {
  const slug = `k6-dash-${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      tenantName: 'k6 Dashboard Test',
      tenantSlug: slug,
      email: `k6-dash@${slug}.test`,
      password: 'K6StressTest123!',
      firstName: 'K6',
      lastName: 'Dashboard',
    }),
    jsonHeaders(),
  );

  if (res.status !== 201) {
    return { setupFailed: true };
  }

  const body = JSON.parse(res.body);
  return { accessToken: body.accessToken };
}

export default function (data) {
  if (data.setupFailed) return;

  const headers = authHeaders(data.accessToken);

  // ── Dashboard Stats ──────────────────────────────────────────────────────
  group('dashboard-stats', () => {
    const res = http.get(`${BASE_URL}/dashboard/stats`, headers);
    statsDuration.add(res.timings.duration);
    const ok = check(res, {
      'stats: status 200': (r) => r.status === 200,
    });
    if (!ok) dashErrors.add(1);
  });

  sleep(0.3);

  // ── Dashboard Recent ─────────────────────────────────────────────────────
  group('dashboard-recent', () => {
    const res = http.get(`${BASE_URL}/dashboard/recent`, headers);
    check(res, {
      'recent: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  // ── Dashboard KPIs ───────────────────────────────────────────────────────
  group('dashboard-kpis', () => {
    const res = http.get(`${BASE_URL}/dashboard/kpis`, headers);
    kpiDuration.add(res.timings.duration);
    check(res, {
      'kpis: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  // ── Owner Dashboard (heaviest aggregation) ───────────────────────────────
  group('owner-dashboard', () => {
    const res = http.get(`${BASE_URL}/dashboard/owner`, headers);
    check(res, {
      'owner dash: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.3);

  // ── Company360 Overview ──────────────────────────────────────────────────
  group('company360-overview', () => {
    const res = http.get(`${BASE_URL}/company360`, headers);
    company360Duration.add(res.timings.duration);
    check(res, {
      'c360 overview: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Company360 Financial Summary ─────────────────────────────────────────
  group('company360-financial', () => {
    const res = http.get(`${BASE_URL}/company360/financial-summary`, headers);
    check(res, {
      'c360 financial: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Company360 Operational KPIs ──────────────────────────────────────────
  group('company360-operational', () => {
    const res = http.get(`${BASE_URL}/company360/operational-kpis`, headers);
    check(res, {
      'c360 operational: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Audit Logs (with filters) ────────────────────────────────────────────
  group('audit-list', () => {
    const res = http.get(`${BASE_URL}/audit?limit=50`, headers);
    auditDuration.add(res.timings.duration);
    check(res, {
      'audit list: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Audit with date range filter ─────────────────────────────────────────
  group('audit-filtered', () => {
    const res = http.get(
      `${BASE_URL}/audit?entityType=work_order&dateFrom=2024-01-01&dateTo=2026-12-31&limit=100`,
      headers,
    );
    check(res, {
      'audit filtered: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Notifications ────────────────────────────────────────────────────────
  group('notifications', () => {
    const res = http.get(`${BASE_URL}/dashboard/notifications`, headers);
    check(res, {
      'notifications: status 200': (r) => r.status === 200,
    });
  });

  // ── Work Order Stats (heavy aggregation) ─────────────────────────────────
  group('wo-stats', () => {
    const res = http.get(`${BASE_URL}/work-orders/stats`, headers);
    check(res, {
      'wo stats: status 200': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 2 + 0.5);
}
