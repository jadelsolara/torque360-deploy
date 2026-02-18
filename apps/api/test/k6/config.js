/**
 * TORQUE 360 — k6 Stress Test Configuration
 *
 * Environment variables:
 *   BASE_URL   — API base URL (default: http://localhost:3000/api)
 *   VUS        — max virtual users (default: 100)
 *   DURATION   — test duration (default: 5m)
 */

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api';
export const MAX_VUS = parseInt(__ENV.VUS || '100', 10);
export const DURATION = __ENV.DURATION || '5m';

// ── Shared thresholds ──────────────────────────────────────────────────────
export const THRESHOLDS = {
  http_req_duration: ['p(95)<500', 'p(99)<1500'],
  http_req_failed: ['rate<0.05'],
  http_reqs: ['rate>50'],
};

// ── Ramp-up profiles ───────────────────────────────────────────────────────

export const SMOKE_STAGES = [
  { duration: '30s', target: 5 },
  { duration: '1m', target: 5 },
  { duration: '30s', target: 0 },
];

export const LOAD_STAGES = [
  { duration: '1m', target: Math.round(MAX_VUS * 0.25) },
  { duration: '3m', target: Math.round(MAX_VUS * 0.5) },
  { duration: '3m', target: MAX_VUS },
  { duration: '2m', target: MAX_VUS },
  { duration: '1m', target: 0 },
];

export const STRESS_STAGES = [
  { duration: '1m', target: Math.round(MAX_VUS * 0.5) },
  { duration: '2m', target: MAX_VUS },
  { duration: '3m', target: MAX_VUS * 2 },
  { duration: '2m', target: MAX_VUS * 3 },
  { duration: '1m', target: MAX_VUS * 5 },
  { duration: '2m', target: MAX_VUS * 5 },
  { duration: '2m', target: 0 },
];

export const SPIKE_STAGES = [
  { duration: '30s', target: 10 },
  { duration: '10s', target: MAX_VUS * 10 },
  { duration: '1m', target: MAX_VUS * 10 },
  { duration: '10s', target: 10 },
  { duration: '1m', target: 10 },
  { duration: '30s', target: 0 },
];

export const SOAK_STAGES = [
  { duration: '2m', target: Math.round(MAX_VUS * 0.5) },
  { duration: '30m', target: Math.round(MAX_VUS * 0.5) },
  { duration: '2m', target: 0 },
];

// ── HTTP params builder ────────────────────────────────────────────────────

export function authHeaders(token) {
  return {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
}

export function jsonHeaders() {
  return {
    headers: { 'Content-Type': 'application/json' },
  };
}
