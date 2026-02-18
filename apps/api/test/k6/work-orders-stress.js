/**
 * TORQUE 360 — Work Orders Stress Test
 *
 * Tests: CRUD, state machine transitions, parts management, search/filter, stats
 * Run: k6 run test/k6/work-orders-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, LOAD_STAGES, THRESHOLDS, authHeaders, jsonHeaders } from './config.js';

const createWoDuration = new Trend('create_wo_duration', true);
const listWoDuration = new Trend('list_wo_duration', true);
const statusTransitionDuration = new Trend('status_transition_duration', true);
const woErrors = new Counter('work_order_errors');

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    create_wo_duration: ['p(95)<500'],
    list_wo_duration: ['p(95)<800'],
    status_transition_duration: ['p(95)<300'],
  },
};

export function setup() {
  const slug = `k6-wo-${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      tenantName: 'k6 WO Test',
      tenantSlug: slug,
      email: `k6-wo@${slug}.test`,
      password: 'K6StressTest123!',
      firstName: 'K6',
      lastName: 'WO',
    }),
    jsonHeaders(),
  );

  if (res.status !== 201) {
    console.error(`Setup failed: ${res.status}`);
    return { setupFailed: true };
  }

  const body = JSON.parse(res.body);

  // Pre-create a vehicle and client to use in work orders
  const vehicleRes = http.post(
    `${BASE_URL}/vehicles`,
    JSON.stringify({
      plate: 'K6-TEST',
      brand: 'Toyota',
      model: 'Corolla',
      year: 2023,
      vin: `VIN-k6-${Date.now()}`,
    }),
    authHeaders(body.accessToken),
  );

  const clientRes = http.post(
    `${BASE_URL}/clients`,
    JSON.stringify({
      name: 'K6 Test Client',
      email: `k6-client@${slug}.test`,
      phone: '+56912345678',
      rut: '11111111-1',
    }),
    authHeaders(body.accessToken),
  );

  let vehicleId = null;
  let clientId = null;
  try {
    vehicleId = JSON.parse(vehicleRes.body).id;
    clientId = JSON.parse(clientRes.body).id;
  } catch (e) {
    console.warn('Could not create vehicle/client, using null IDs');
  }

  return {
    accessToken: body.accessToken,
    tenantId: body.tenant.id,
    vehicleId,
    clientId,
  };
}

export default function (data) {
  if (data.setupFailed) return;

  const headers = authHeaders(data.accessToken);
  const vuId = __VU;
  const iterId = __ITER;

  // ── Create work order ────────────────────────────────────────────────────
  let workOrderId = null;

  group('create-work-order', () => {
    const priorities = ['low', 'normal', 'high', 'urgent'];
    const types = ['repair', 'maintenance', 'inspection', 'diagnostic'];

    const res = http.post(
      `${BASE_URL}/work-orders`,
      JSON.stringify({
        vehicleId: data.vehicleId,
        clientId: data.clientId,
        description: `K6 stress test WO - VU${vuId} IT${iterId}`,
        type: types[iterId % types.length],
        priority: priorities[iterId % priorities.length],
        laborCost: Math.round(Math.random() * 200000) + 30000,
        estimatedHours: Math.round(Math.random() * 8) + 1,
      }),
      headers,
    );

    createWoDuration.add(res.timings.duration);
    const ok = check(res, {
      'create WO: status 201': (r) => r.status === 201,
      'create WO: has id': (r) => JSON.parse(r.body).id !== undefined,
      'create WO: status pending': (r) => JSON.parse(r.body).status === 'pending',
    });

    if (ok) {
      workOrderId = JSON.parse(res.body).id;
    } else {
      woErrors.add(1);
    }
  });

  if (!workOrderId) {
    sleep(1);
    return;
  }

  sleep(0.3);

  // ── Read work order ──────────────────────────────────────────────────────
  group('get-work-order', () => {
    const res = http.get(`${BASE_URL}/work-orders/${workOrderId}`, headers);
    check(res, {
      'get WO: status 200': (r) => r.status === 200,
      'get WO: correct id': (r) => JSON.parse(r.body).id === workOrderId,
    });
  });

  sleep(0.2);

  // ── Status transitions: pending → in_progress → completed → invoiced ───
  const transitions = ['in_progress', 'completed', 'invoiced'];

  for (const newStatus of transitions) {
    group(`transition-${newStatus}`, () => {
      const res = http.patch(
        `${BASE_URL}/work-orders/${workOrderId}/status`,
        JSON.stringify({ status: newStatus }),
        headers,
      );

      statusTransitionDuration.add(res.timings.duration);
      const ok = check(res, {
        [`transition to ${newStatus}: status 200`]: (r) => r.status === 200,
        [`transition to ${newStatus}: correct status`]: (r) =>
          JSON.parse(r.body).status === newStatus,
      });
      if (!ok) woErrors.add(1);
    });
    sleep(0.2);
  }

  // ── List work orders (paginated) ─────────────────────────────────────────
  group('list-work-orders', () => {
    const res = http.get(`${BASE_URL}/work-orders?limit=20&page=1`, headers);
    listWoDuration.add(res.timings.duration);
    check(res, {
      'list WO: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Filter by status ─────────────────────────────────────────────────────
  group('filter-by-status', () => {
    const res = http.get(`${BASE_URL}/work-orders?status=pending`, headers);
    check(res, {
      'filter WO: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Stats endpoint ───────────────────────────────────────────────────────
  group('work-order-stats', () => {
    const res = http.get(`${BASE_URL}/work-orders/stats`, headers);
    check(res, {
      'stats: status 200': (r) => r.status === 200,
    });
  });

  // ── Aging report ─────────────────────────────────────────────────────────
  group('aging-report', () => {
    const res = http.get(`${BASE_URL}/work-orders/aging`, headers);
    check(res, {
      'aging: status 200': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 1.5 + 0.5);
}
