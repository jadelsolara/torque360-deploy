/**
 * TORQUE 360 — Inventory & WMS Stress Test
 *
 * Tests: CRUD, stock adjustments, search, low stock alerts, cost operations
 * Run: k6 run test/k6/inventory-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, LOAD_STAGES, THRESHOLDS, authHeaders, jsonHeaders } from './config.js';

const createItemDuration = new Trend('create_item_duration', true);
const stockAdjustDuration = new Trend('stock_adjust_duration', true);
const searchDuration = new Trend('search_duration', true);
const inventoryErrors = new Counter('inventory_errors');

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    create_item_duration: ['p(95)<400'],
    stock_adjust_duration: ['p(95)<300'],
    search_duration: ['p(95)<600'],
  },
};

export function setup() {
  const slug = `k6-inv-${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      tenantName: 'k6 Inventory Test',
      tenantSlug: slug,
      email: `k6-inv@${slug}.test`,
      password: 'K6StressTest123!',
      firstName: 'K6',
      lastName: 'Inventory',
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

  const categories = ['brakes', 'engine', 'electrical', 'suspension', 'fluids', 'filters'];
  const brands = ['Bosch', 'Denso', 'Mann', 'NGK', 'Brembo', 'Monroe', 'Sachs'];

  // ── Create inventory item ────────────────────────────────────────────────
  let itemId = null;

  group('create-item', () => {
    const sku = `K6-${vuId}-${iterId}-${Date.now()}`;
    const res = http.post(
      `${BASE_URL}/inventory`,
      JSON.stringify({
        name: `K6 Part VU${vuId} IT${iterId}`,
        sku,
        description: `Stress test part created by VU${vuId}`,
        category: categories[iterId % categories.length],
        brand: brands[iterId % brands.length],
        partNumber: `PN-${sku}`,
        unit: 'unit',
        costPrice: Math.round(Math.random() * 50000) + 1000,
        sellPrice: Math.round(Math.random() * 80000) + 5000,
        stockQuantity: Math.round(Math.random() * 100) + 10,
        minStock: 5,
      }),
      headers,
    );

    createItemDuration.add(res.timings.duration);
    const ok = check(res, {
      'create item: status 201': (r) => r.status === 201,
      'create item: has id': (r) => JSON.parse(r.body).id !== undefined,
    });

    if (ok) {
      itemId = JSON.parse(res.body).id;
    } else {
      inventoryErrors.add(1);
    }
  });

  if (!itemId) {
    sleep(1);
    return;
  }

  sleep(0.2);

  // ── Stock adjustment: ADD ────────────────────────────────────────────────
  group('stock-add', () => {
    const res = http.patch(
      `${BASE_URL}/inventory/${itemId}/stock`,
      JSON.stringify({ operation: 'add', quantity: 25 }),
      headers,
    );

    stockAdjustDuration.add(res.timings.duration);
    check(res, {
      'stock add: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Stock adjustment: SUBTRACT ───────────────────────────────────────────
  group('stock-subtract', () => {
    const res = http.patch(
      `${BASE_URL}/inventory/${itemId}/stock`,
      JSON.stringify({ operation: 'subtract', quantity: 5 }),
      headers,
    );

    stockAdjustDuration.add(res.timings.duration);
    check(res, {
      'stock subtract: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Get item by ID ───────────────────────────────────────────────────────
  group('get-item', () => {
    const res = http.get(`${BASE_URL}/inventory/${itemId}`, headers);
    check(res, {
      'get item: status 200': (r) => r.status === 200,
      'get item: correct id': (r) => JSON.parse(r.body).id === itemId,
    });
  });

  sleep(0.2);

  // ── Search inventory ─────────────────────────────────────────────────────
  group('search-inventory', () => {
    const terms = ['brake', 'oil', 'filter', 'pad', 'sensor', 'pump'];
    const term = terms[iterId % terms.length];
    const res = http.get(`${BASE_URL}/inventory?search=${term}`, headers);

    searchDuration.add(res.timings.duration);
    check(res, {
      'search: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Filter by category ──────────────────────────────────────────────────
  group('filter-category', () => {
    const cat = categories[iterId % categories.length];
    const res = http.get(`${BASE_URL}/inventory?category=${cat}`, headers);
    check(res, {
      'filter category: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Low stock alerts ─────────────────────────────────────────────────────
  group('low-stock-alerts', () => {
    const res = http.get(`${BASE_URL}/inventory/low-stock`, headers);
    check(res, {
      'low stock: status 200': (r) => r.status === 200,
    });
  });

  // ── List all items ───────────────────────────────────────────────────────
  group('list-all-items', () => {
    const res = http.get(`${BASE_URL}/inventory`, headers);
    check(res, {
      'list items: status 200': (r) => r.status === 200,
    });
  });

  sleep(Math.random() * 1.5 + 0.5);
}
