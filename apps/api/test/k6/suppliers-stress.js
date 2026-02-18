/**
 * TORQUE 360 — Suppliers & Accounts Payable Stress Test
 *
 * Tests: Supplier CRUD, invoices, payments, A/P reports, cash flow
 * Run: k6 run test/k6/suppliers-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, LOAD_STAGES, THRESHOLDS, authHeaders, jsonHeaders } from './config.js';

const createSupplierDuration = new Trend('create_supplier_duration', true);
const apSummaryDuration = new Trend('ap_summary_duration', true);
const supplierErrors = new Counter('supplier_errors');

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    create_supplier_duration: ['p(95)<400'],
    ap_summary_duration: ['p(95)<800'],
  },
};

export function setup() {
  const slug = `k6-sup-${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      tenantName: 'k6 Suppliers Test',
      tenantSlug: slug,
      email: `k6-sup@${slug}.test`,
      password: 'K6StressTest123!',
      firstName: 'K6',
      lastName: 'Suppliers',
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

  const countries = ['CL', 'AR', 'BR', 'US', 'CN', 'DE', 'JP'];

  // ── Create supplier ────────────────────────────────────────────────────
  let supplierId = null;

  group('create-supplier', () => {
    const res = http.post(
      `${BASE_URL}/suppliers`,
      JSON.stringify({
        name: `K6 Supplier VU${vuId}-IT${iterId}`,
        rut: `${76000000 + vuId * 100 + iterId}-0`,
        email: `sup-${vuId}-${iterId}-${Date.now()}@k6test.cl`,
        phone: '+56922334455',
        country: countries[iterId % countries.length],
        category: 'repuestos',
        paymentTerms: 30,
      }),
      headers,
    );

    createSupplierDuration.add(res.timings.duration);
    const ok = check(res, {
      'create supplier: status 201': (r) => r.status === 201,
    });

    if (ok) {
      supplierId = JSON.parse(res.body).id;
    } else {
      supplierErrors.add(1);
    }
  });

  if (!supplierId) {
    sleep(1);
    return;
  }

  sleep(0.2);

  // ── Get supplier ───────────────────────────────────────────────────────
  group('get-supplier', () => {
    const res = http.get(`${BASE_URL}/suppliers/${supplierId}`, headers);
    check(res, {
      'get supplier: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── List suppliers with filters ────────────────────────────────────────
  group('list-suppliers', () => {
    const country = countries[iterId % countries.length];
    const res = http.get(
      `${BASE_URL}/suppliers?country=${country}&search=K6`,
      headers,
    );
    check(res, {
      'list suppliers: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Top suppliers ──────────────────────────────────────────────────────
  group('top-suppliers', () => {
    const res = http.get(`${BASE_URL}/suppliers/top`, headers);
    check(res, {
      'top suppliers: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Update supplier rating ─────────────────────────────────────────────
  group('update-rating', () => {
    const res = http.patch(
      `${BASE_URL}/suppliers/${supplierId}/rating`,
      JSON.stringify({ rating: Math.round(Math.random() * 4) + 1 }),
      headers,
    );
    check(res, {
      'update rating: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Create supplier invoice ────────────────────────────────────────────
  let invoiceId = null;

  group('create-supplier-invoice', () => {
    const res = http.post(
      `${BASE_URL}/suppliers/invoices`,
      JSON.stringify({
        supplierId,
        invoiceNumber: `INV-${vuId}-${iterId}-${Date.now()}`,
        amount: Math.round(Math.random() * 5000000) + 100000,
        currency: 'CLP',
        issueDate: '2025-01-15',
        dueDate: '2025-02-15',
        description: `K6 supplier invoice VU${vuId}`,
      }),
      headers,
    );

    const ok = check(res, {
      'supplier invoice: status 201': (r) => r.status === 201,
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

  // ── Approve supplier invoice ───────────────────────────────────────────
  if (invoiceId) {
    group('approve-supplier-invoice', () => {
      const res = http.patch(
        `${BASE_URL}/suppliers/invoices/${invoiceId}/approve`,
        '{}',
        headers,
      );
      check(res, {
        'approve invoice: status 200': (r) => r.status === 200,
      });
    });

    sleep(0.2);

    // ── Create supplier payment ──────────────────────────────────────────
    group('create-supplier-payment', () => {
      const res = http.post(
        `${BASE_URL}/suppliers/payments`,
        JSON.stringify({
          supplierId,
          invoiceId,
          amount: 100000,
          method: 'transfer',
          reference: `PAY-SUP-${vuId}-${iterId}`,
        }),
        headers,
      );
      check(res, {
        'supplier payment: status 201 or 200': (r) =>
          r.status === 201 || r.status === 200,
      });
    });
  }

  sleep(0.2);

  // ── Accounts payable summary ───────────────────────────────────────────
  group('ap-summary', () => {
    const res = http.get(`${BASE_URL}/suppliers/accounts-payable`, headers);
    apSummaryDuration.add(res.timings.duration);
    check(res, {
      'A/P summary: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Supplier balance ───────────────────────────────────────────────────
  group('supplier-balance', () => {
    const res = http.get(
      `${BASE_URL}/suppliers/${supplierId}/balance`,
      headers,
    );
    check(res, {
      'supplier balance: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Payment calendar ───────────────────────────────────────────────────
  group('payment-calendar', () => {
    const res = http.get(`${BASE_URL}/suppliers/payment-calendar`, headers);
    check(res, {
      'payment calendar: status 200': (r) => r.status === 200,
    });
  });

  // ── Cash flow projection ───────────────────────────────────────────────
  group('cash-flow', () => {
    const res = http.get(`${BASE_URL}/suppliers/cash-flow`, headers);
    check(res, {
      'cash flow: status 200': (r) => r.status === 200,
    });
  });

  // ── Monthly purchases ──────────────────────────────────────────────────
  group('monthly-purchases', () => {
    const res = http.get(`${BASE_URL}/suppliers/monthly-purchases`, headers);
    check(res, {
      'monthly purchases: status 200': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 1.5 + 0.5);
}
