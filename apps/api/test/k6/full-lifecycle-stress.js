/**
 * TORQUE 360 — Full Lifecycle Stress Test
 *
 * End-to-end flow: Register → Client → Vehicle → Quotation → Convert to WO
 * → Add Parts → State Transitions → Invoice → Payment
 *
 * This simulates a real workshop day across the entire sales pipeline.
 * Run: k6 run test/k6/full-lifecycle-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, LOAD_STAGES, THRESHOLDS, authHeaders, jsonHeaders } from './config.js';

const pipelineDuration = new Trend('full_pipeline_duration', true);
const quotationDuration = new Trend('quotation_create_duration', true);
const invoiceDuration = new Trend('invoice_create_duration', true);
const lifecycleErrors = new Counter('lifecycle_errors');

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    full_pipeline_duration: ['p(95)<5000'],
    quotation_create_duration: ['p(95)<500'],
    invoice_create_duration: ['p(95)<800'],
  },
};

export function setup() {
  const slug = `k6-life-${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      tenantName: 'k6 Lifecycle Test',
      tenantSlug: slug,
      email: `k6-life@${slug}.test`,
      password: 'K6StressTest123!',
      firstName: 'K6',
      lastName: 'Lifecycle',
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
  const vuId = __VU;
  const iterId = __ITER;
  const pipelineStart = Date.now();

  // ── Step 1: Create Client ──────────────────────────────────────────────
  let clientId = null;

  group('01-create-client', () => {
    const res = http.post(
      `${BASE_URL}/clients`,
      JSON.stringify({
        name: `K6 Client VU${vuId}-IT${iterId}`,
        email: `client-${vuId}-${iterId}-${Date.now()}@k6test.cl`,
        phone: `+5691${String(vuId).padStart(4, '0')}${String(iterId).padStart(4, '0')}`,
        rut: `${12000000 + vuId * 100 + iterId}-0`,
      }),
      headers,
    );

    const ok = check(res, {
      'create client: status 201': (r) => r.status === 201,
    });

    if (ok) {
      clientId = JSON.parse(res.body).id;
    } else {
      lifecycleErrors.add(1);
    }
  });

  if (!clientId) {
    sleep(1);
    return;
  }

  sleep(0.2);

  // ── Step 2: Create Vehicle ─────────────────────────────────────────────
  let vehicleId = null;

  group('02-create-vehicle', () => {
    const brands = ['Toyota', 'Hyundai', 'Kia', 'Chevrolet', 'Nissan', 'Suzuki'];
    const models = ['Corolla', 'Accent', 'Sportage', 'Spark', 'Sentra', 'Swift'];
    const idx = iterId % brands.length;

    const res = http.post(
      `${BASE_URL}/vehicles`,
      JSON.stringify({
        plate: `K6-${vuId}-${iterId}`.substring(0, 8),
        brand: brands[idx],
        model: models[idx],
        year: 2020 + (iterId % 5),
        vin: `VIN-${vuId}-${iterId}-${Date.now()}`,
        clientId,
      }),
      headers,
    );

    const ok = check(res, {
      'create vehicle: status 201': (r) => r.status === 201,
    });

    if (ok) {
      vehicleId = JSON.parse(res.body).id;
    } else {
      lifecycleErrors.add(1);
    }
  });

  if (!vehicleId) {
    sleep(1);
    return;
  }

  sleep(0.2);

  // ── Step 3: Create Inventory Items (parts for the WO) ─────────────────
  const partIds = [];

  group('03-create-parts', () => {
    for (let i = 0; i < 3; i++) {
      const sku = `LIFE-${vuId}-${iterId}-P${i}-${Date.now()}`;
      const res = http.post(
        `${BASE_URL}/inventory`,
        JSON.stringify({
          name: `Part ${i} VU${vuId}`,
          sku,
          category: ['brakes', 'engine', 'electrical'][i],
          unit: 'unit',
          costPrice: 5000 + i * 2000,
          sellPrice: 10000 + i * 3000,
          stockQuantity: 50,
          minStock: 5,
        }),
        headers,
      );

      try {
        const body = JSON.parse(res.body);
        if (body.id) partIds.push({ id: body.id, sellPrice: 10000 + i * 3000 });
      } catch (e) {
        // skip
      }
    }

    check(null, {
      'created at least 1 part': () => partIds.length > 0,
    });
  });

  sleep(0.2);

  // ── Step 4: Create Quotation ───────────────────────────────────────────
  let quotationId = null;

  group('04-create-quotation', () => {
    const items = partIds.map((p, i) => ({
      inventoryItemId: p.id,
      quantity: i + 1,
      unitPrice: p.sellPrice,
    }));

    const res = http.post(
      `${BASE_URL}/quotations`,
      JSON.stringify({
        clientId,
        vehicleId,
        description: `K6 lifecycle quotation VU${vuId}-IT${iterId}`,
        items: items.length > 0 ? items : undefined,
        laborCost: 45000,
        validUntil: '2026-12-31',
      }),
      headers,
    );

    quotationDuration.add(res.timings.duration);
    const ok = check(res, {
      'create quotation: status 201': (r) => r.status === 201,
    });

    if (ok) {
      quotationId = JSON.parse(res.body).id;
    } else {
      lifecycleErrors.add(1);
    }
  });

  if (!quotationId) {
    sleep(1);
    return;
  }

  sleep(0.3);

  // ── Step 5: Approve quotation ──────────────────────────────────────────
  group('05-approve-quotation', () => {
    const res = http.patch(
      `${BASE_URL}/quotations/${quotationId}/status`,
      JSON.stringify({ status: 'approved' }),
      headers,
    );
    check(res, {
      'approve quotation: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Step 6: Convert quotation to work order ────────────────────────────
  let workOrderId = null;

  group('06-convert-to-wo', () => {
    const res = http.post(
      `${BASE_URL}/quotations/${quotationId}/convert`,
      '{}',
      headers,
    );

    const ok = check(res, {
      'convert to WO: status 200 or 201': (r) =>
        r.status === 200 || r.status === 201,
    });

    if (ok) {
      try {
        const body = JSON.parse(res.body);
        workOrderId = body.id || body.workOrderId;
      } catch (e) {
        // skip
      }
    }

    if (!workOrderId) {
      lifecycleErrors.add(1);
    }
  });

  // Fallback: create WO directly if conversion didn't return an ID
  if (!workOrderId) {
    group('06b-create-wo-fallback', () => {
      const res = http.post(
        `${BASE_URL}/work-orders`,
        JSON.stringify({
          vehicleId,
          clientId,
          description: `K6 lifecycle WO VU${vuId}-IT${iterId}`,
          type: 'repair',
          priority: 'normal',
          laborCost: 45000,
          estimatedHours: 3,
        }),
        headers,
      );

      if (res.status === 201) {
        workOrderId = JSON.parse(res.body).id;
      }
    });
  }

  if (!workOrderId) {
    sleep(1);
    return;
  }

  sleep(0.3);

  // ── Step 7: Add parts to work order ────────────────────────────────────
  group('07-add-parts-to-wo', () => {
    for (const part of partIds) {
      const res = http.post(
        `${BASE_URL}/work-orders/${workOrderId}/parts`,
        JSON.stringify({
          inventoryItemId: part.id,
          quantity: 1,
          unitPrice: part.sellPrice,
        }),
        headers,
      );
      check(res, {
        'add part: status 201 or 200': (r) =>
          r.status === 201 || r.status === 200,
      });
    }
  });

  sleep(0.2);

  // ── Step 8: State transitions → in_progress → completed ───────────────
  group('08-start-work', () => {
    const res = http.patch(
      `${BASE_URL}/work-orders/${workOrderId}/status`,
      JSON.stringify({ status: 'in_progress' }),
      headers,
    );
    check(res, {
      'start work: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.5); // Simulate actual work time

  group('09-complete-work', () => {
    const res = http.patch(
      `${BASE_URL}/work-orders/${workOrderId}/status`,
      JSON.stringify({ status: 'completed' }),
      headers,
    );
    check(res, {
      'complete work: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Step 9: Create invoice from work order ─────────────────────────────
  let invoiceId = null;

  group('10-create-invoice', () => {
    const res = http.post(
      `${BASE_URL}/facturacion/from-work-order/${workOrderId}`,
      '{}',
      headers,
    );

    invoiceDuration.add(res.timings.duration);
    const ok = check(res, {
      'create invoice: status 201 or 200': (r) =>
        r.status === 201 || r.status === 200,
    });

    if (ok) {
      try {
        invoiceId = JSON.parse(res.body).id;
      } catch (e) {
        // skip
      }
    }
  });

  sleep(0.2);

  // ── Step 10: Record client payment ─────────────────────────────────────
  if (invoiceId) {
    group('11-record-payment', () => {
      const res = http.post(
        `${BASE_URL}/clients/payments`,
        JSON.stringify({
          clientId,
          invoiceId,
          amount: 100000,
          method: 'transfer',
          reference: `PAY-${vuId}-${iterId}`,
        }),
        headers,
      );
      check(res, {
        'record payment: status 201 or 200': (r) =>
          r.status === 201 || r.status === 200,
      });
    });
  }

  sleep(0.2);

  // ── Step 11: Verify pipeline — get client details ──────────────────────
  group('12-verify-client-details', () => {
    const res = http.get(`${BASE_URL}/clients/${clientId}/details`, headers);
    check(res, {
      'client details: status 200': (r) => r.status === 200,
    });
  });

  // ── Step 12: Verify pipeline — vehicle history ─────────────────────────
  group('13-verify-vehicle-history', () => {
    const res = http.get(`${BASE_URL}/vehicles/${vehicleId}/history`, headers);
    check(res, {
      'vehicle history: status 200': (r) => r.status === 200,
    });
  });

  // Track full pipeline duration
  pipelineDuration.add(Date.now() - pipelineStart);

  sleep(Math.random() * 2 + 0.5);
}
