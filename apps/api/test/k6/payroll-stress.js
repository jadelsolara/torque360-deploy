/**
 * TORQUE 360 — Payroll & HR Stress Test
 *
 * Tests: Employee CRUD, payroll lifecycle, attendance, heavy calculations
 * Run: k6 run test/k6/payroll-stress.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';
import { BASE_URL, LOAD_STAGES, THRESHOLDS, authHeaders, jsonHeaders } from './config.js';

const createEmployeeDuration = new Trend('create_employee_duration', true);
const calculatePayrollDuration = new Trend('calculate_payroll_duration', true);
const payrollListDuration = new Trend('payroll_list_duration', true);
const payrollErrors = new Counter('payroll_errors');

export const options = {
  stages: LOAD_STAGES,
  thresholds: {
    ...THRESHOLDS,
    create_employee_duration: ['p(95)<400'],
    calculate_payroll_duration: ['p(95)<1500'],
    payroll_list_duration: ['p(95)<600'],
  },
};

export function setup() {
  const slug = `k6-pay-${Date.now()}`;
  const res = http.post(
    `${BASE_URL}/auth/register`,
    JSON.stringify({
      tenantName: 'k6 Payroll Test',
      tenantSlug: slug,
      email: `k6-pay@${slug}.test`,
      password: 'K6StressTest123!',
      firstName: 'K6',
      lastName: 'Payroll',
    }),
    jsonHeaders(),
  );

  if (res.status !== 201) {
    return { setupFailed: true };
  }

  const body = JSON.parse(res.body);
  const headers = authHeaders(body.accessToken);

  // Pre-create employees for payroll tests
  const employeeIds = [];
  const departments = ['mecanica', 'pintura', 'electrica', 'admin'];

  for (let i = 0; i < 5; i++) {
    const empRes = http.post(
      `${BASE_URL}/rrhh/employees`,
      JSON.stringify({
        firstName: `K6Worker${i}`,
        lastName: `Test${i}`,
        rut: `${10000000 + i}-${i}`,
        email: `worker${i}@${slug}.test`,
        position: 'Mecánico',
        department: departments[i % departments.length],
        baseSalary: 500000 + i * 100000,
        hireDate: '2024-01-15',
        contractType: 'indefinido',
        afpCode: 'HABITAT',
        healthPlan: 'FONASA',
      }),
      headers,
    );

    try {
      const emp = JSON.parse(empRes.body);
      if (emp.id) employeeIds.push(emp.id);
    } catch (e) {
      // skip
    }
  }

  return {
    accessToken: body.accessToken,
    employeeIds,
  };
}

export default function (data) {
  if (data.setupFailed) return;

  const headers = authHeaders(data.accessToken);
  const vuId = __VU;
  const iterId = __ITER;

  const departments = ['mecanica', 'pintura', 'electrica', 'admin', 'recepcion'];

  // ── Create employee ──────────────────────────────────────────────────────
  let employeeId = null;

  group('create-employee', () => {
    const res = http.post(
      `${BASE_URL}/rrhh/employees`,
      JSON.stringify({
        firstName: `K6VU${vuId}`,
        lastName: `IT${iterId}-${Date.now()}`,
        rut: `${20000000 + vuId * 1000 + iterId}-0`,
        email: `vu${vuId}-it${iterId}-${Date.now()}@paytest.cl`,
        position: 'Técnico',
        department: departments[iterId % departments.length],
        baseSalary: Math.round(Math.random() * 1500000) + 460000,
        hireDate: '2024-06-01',
        contractType: iterId % 3 === 0 ? 'plazo_fijo' : 'indefinido',
        afpCode: ['HABITAT', 'PROVIDA', 'CUPRUM', 'CAPITAL'][iterId % 4],
        healthPlan: iterId % 2 === 0 ? 'FONASA' : 'ISAPRE',
      }),
      headers,
    );

    createEmployeeDuration.add(res.timings.duration);
    const ok = check(res, {
      'create employee: status 201': (r) => r.status === 201,
    });

    if (ok) {
      employeeId = JSON.parse(res.body).id;
    } else {
      payrollErrors.add(1);
    }
  });

  sleep(0.2);

  // ── List employees ───────────────────────────────────────────────────────
  group('list-employees', () => {
    const res = http.get(`${BASE_URL}/rrhh/employees`, headers);
    check(res, {
      'list employees: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Headcount ────────────────────────────────────────────────────────────
  group('headcount', () => {
    const res = http.get(`${BASE_URL}/rrhh/employees/headcount`, headers);
    check(res, {
      'headcount: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Employees by department ──────────────────────────────────────────────
  group('by-department', () => {
    const res = http.get(`${BASE_URL}/rrhh/employees/by-department`, headers);
    check(res, {
      'by-department: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Create payroll (heavy) ───────────────────────────────────────────────
  let payrollId = null;

  group('create-payroll', () => {
    const month = ((iterId % 12) + 1).toString().padStart(2, '0');
    const res = http.post(
      `${BASE_URL}/rrhh/payroll`,
      JSON.stringify({
        period: `2025-${month}`,
        type: 'monthly',
      }),
      headers,
    );

    const ok = check(res, {
      'create payroll: status 201': (r) => r.status === 201,
    });

    if (ok) {
      payrollId = JSON.parse(res.body).id;
    }
  });

  if (!payrollId) {
    sleep(1);
    return;
  }

  sleep(0.3);

  // ── Calculate payroll (heaviest — Chilean tax + AFP + health) ────────────
  group('calculate-payroll', () => {
    const res = http.post(
      `${BASE_URL}/rrhh/payroll/${payrollId}/calculate`,
      JSON.stringify({ overrides: {} }),
      headers,
    );

    calculatePayrollDuration.add(res.timings.duration);
    check(res, {
      'calculate payroll: status 200 or 201': (r) =>
        r.status === 200 || r.status === 201,
    });
  });

  sleep(0.3);

  // ── Get payroll detail ───────────────────────────────────────────────────
  group('payroll-detail', () => {
    const res = http.get(`${BASE_URL}/rrhh/payroll/${payrollId}/details`, headers);
    check(res, {
      'payroll detail: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Approve payroll ──────────────────────────────────────────────────────
  group('approve-payroll', () => {
    const res = http.patch(
      `${BASE_URL}/rrhh/payroll/${payrollId}/approve`,
      '{}',
      headers,
    );
    check(res, {
      'approve payroll: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Mark payroll as paid ─────────────────────────────────────────────────
  group('pay-payroll', () => {
    const res = http.patch(
      `${BASE_URL}/rrhh/payroll/${payrollId}/pay`,
      '{}',
      headers,
    );
    check(res, {
      'pay payroll: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── List payrolls ────────────────────────────────────────────────────────
  group('list-payrolls', () => {
    const res = http.get(`${BASE_URL}/rrhh/payroll`, headers);
    payrollListDuration.add(res.timings.duration);
    check(res, {
      'list payrolls: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Payroll summary by year ──────────────────────────────────────────────
  group('payroll-summary', () => {
    const res = http.get(`${BASE_URL}/rrhh/payroll/summary`, headers);
    check(res, {
      'payroll summary: status 200': (r) => r.status === 200,
    });
  });

  sleep(0.2);

  // ── Record attendance ────────────────────────────────────────────────────
  if (data.employeeIds.length > 0) {
    group('record-attendance', () => {
      const empId = data.employeeIds[iterId % data.employeeIds.length];
      const day = ((iterId % 28) + 1).toString().padStart(2, '0');
      const res = http.post(
        `${BASE_URL}/rrhh/attendance`,
        JSON.stringify({
          employeeId: empId,
          date: `2025-01-${day}`,
          checkIn: '08:00',
          checkOut: '17:30',
          type: 'normal',
        }),
        headers,
      );
      check(res, {
        'attendance: status 201 or 200': (r) =>
          r.status === 201 || r.status === 200,
      });
    });

    sleep(0.2);

    // ── Get employee attendance ────────────────────────────────────────────
    group('get-attendance', () => {
      const empId = data.employeeIds[0];
      const res = http.get(
        `${BASE_URL}/rrhh/attendance/employee/${empId}`,
        headers,
      );
      check(res, {
        'get attendance: status 200': (r) => r.status === 200,
      });
    });

    // ── Get overtime ───────────────────────────────────────────────────────
    group('get-overtime', () => {
      const empId = data.employeeIds[0];
      const res = http.get(
        `${BASE_URL}/rrhh/attendance/employee/${empId}/overtime`,
        headers,
      );
      check(res, {
        'overtime: status 200': (r) => r.status === 200,
      });
    });
  }

  sleep(Math.random() * 1.5 + 0.5);
}
