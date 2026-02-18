/**
 * TORQUE 360 — Auth Stress Test
 *
 * Tests: registration, login, token refresh, profile access
 * Run: k6 run test/k6/auth-stress.js
 * Env: BASE_URL=http://localhost:3000/api VUS=100 DURATION=5m
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { BASE_URL, LOAD_STAGES, THRESHOLDS, authHeaders, jsonHeaders } from './config.js';

// ── Custom metrics ─────────────────────────────────────────────────────────
const loginDuration = new Trend('login_duration', true);
const registerDuration = new Trend('register_duration', true);
const tokenRefreshRate = new Rate('token_refresh_success');
const authErrors = new Counter('auth_errors');

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    login_duration: ['p(95)<300', 'p(99)<800'],
    register_duration: ['p(95)<500', 'p(99)<1200'],
    token_refresh_success: ['rate>0.95'],
  },
};

// ── Setup: create a shared tenant ──────────────────────────────────────────
export function setup() {
  const slug = `k6-auth-${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      tenantName: 'k6 Auth Test',
      tenantSlug: slug,
      email: `k6-setup@${slug}.test`,
      password: 'K6StressTest123!',
      firstName: 'K6',
      lastName: 'Setup',
    }),
    jsonHeaders(),
  );

  if (res.status !== 201) {
    console.error(`Setup failed: ${res.status} ${res.body}`);
    return { slug, setupFailed: true };
  }

  const body = JSON.parse(res.body);
  return {
    slug,
    accessToken: body.accessToken,
    refreshToken: body.refreshToken,
    tenantId: body.tenant.id,
  };
}

export default function (data) {
  if (data.setupFailed) return;

  const vuId = __VU;
  const iterId = __ITER;

  // ── Registration (1 in 20 iterations) ────────────────────────────────────
  if (iterId % 20 === 0) {
    group('register', () => {
      const email = `k6-vu${vuId}-it${iterId}-${Date.now()}@test.com`;
      const newSlug = `k6-${vuId}-${iterId}-${Date.now()}`;
      const res = http.post(
        `${BASE_URL}/auth/register`,
        JSON.stringify({
          tenantName: `K6 VU${vuId}`,
          tenantSlug: newSlug,
          email,
          password: 'K6StressTest123!',
          firstName: 'K6',
          lastName: `VU${vuId}`,
        }),
        jsonHeaders(),
      );

      registerDuration.add(res.timings.duration);
      const ok = check(res, {
        'register: status 201': (r) => r.status === 201,
        'register: has accessToken': (r) => JSON.parse(r.body).accessToken !== undefined,
      });
      if (!ok) authErrors.add(1);
    });
  }

  // ── Login ────────────────────────────────────────────────────────────────
  let accessToken = data.accessToken;
  let refreshToken = data.refreshToken;

  group('login', () => {
    const res = http.post(
      `${BASE_URL}/auth/login`,
      JSON.stringify({
        email: `k6-setup@${data.slug}.test`,
        password: 'K6StressTest123!',
      }),
      jsonHeaders(),
    );

    loginDuration.add(res.timings.duration);
    const ok = check(res, {
      'login: status 201': (r) => r.status === 201,
      'login: has tokens': (r) => {
        const b = JSON.parse(r.body);
        return b.accessToken && b.refreshToken;
      },
    });

    if (ok) {
      const body = JSON.parse(res.body);
      accessToken = body.accessToken;
      refreshToken = body.refreshToken;
    } else {
      authErrors.add(1);
    }
  });

  sleep(0.5);

  // ── Profile access ───────────────────────────────────────────────────────
  group('profile', () => {
    const res = http.get(`${BASE_URL}/auth/profile`, authHeaders(accessToken));
    check(res, {
      'profile: status 200': (r) => r.status === 200,
      'profile: has email': (r) => JSON.parse(r.body).email !== undefined,
      'profile: has tenant': (r) => JSON.parse(r.body).tenant !== undefined,
    });
  });

  sleep(0.3);

  // ── Token refresh ────────────────────────────────────────────────────────
  group('refresh', () => {
    const res = http.post(
      `${BASE_URL}/auth/refresh`,
      JSON.stringify({ refreshToken }),
      jsonHeaders(),
    );

    const ok = check(res, {
      'refresh: status 201': (r) => r.status === 201,
      'refresh: new tokens': (r) => JSON.parse(r.body).accessToken !== undefined,
    });

    tokenRefreshRate.add(ok);
    if (!ok) authErrors.add(1);
  });

  // ── Unauthorized access (negative test) ──────────────────────────────────
  group('unauthorized', () => {
    const res = http.get(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: 'Bearer invalid.jwt.token' },
    });
    check(res, {
      'unauthorized: status 401': (r) => r.status === 401,
    });
  });

  sleep(Math.random() * 2 + 0.5);
}
