/**
 * Chilean Payroll Tax Helper
 * ─────────────────────────────────────────────────────────────────────────────
 * All calculation functions for Chilean payroll law:
 * AFP rates, health contributions, unemployment insurance, income tax brackets,
 * gratification, overtime, topes imponibles, and family allowance.
 *
 * Values are accurate for 2024-2025 Chilean legislation.
 * UTM and UF values must be provided at payroll-creation time since they
 * change monthly (published by SII / Banco Central).
 */

// ─── AFP Rates (total rate = dependent contribution, includes SIS commission) ─
export const AFP_RATES: Record<string, number> = {
  CAPITAL: 11.44,
  CUPRUM: 11.44,
  HABITAT: 11.27,
  MODELO: 10.58,
  PLANVITAL: 11.16,
  PROVIDA: 11.45,
  UNO: 10.69,
};

// ─── Topes Imponibles (in UF) ──────────────────────────────────────────────
export const TOPES_IMPONIBLES = {
  AFP: 81.6,
  SEGURO_CESANTIA: 122.6,
  SALUD: 81.6,
};

// ─── Seguro de Cesantía Rates ───────────────────────────────────────────────
export const SEGURO_CESANTIA = {
  INDEFINIDO: { empleado: 0.6, empleador: 2.4 },
  PLAZO_FIJO: { empleado: 0.0, empleador: 3.0 },
  POR_OBRA: { empleado: 0.0, empleador: 3.0 },
};

// ─── Employer Social Charges ────────────────────────────────────────────────
export const SIS_RATE = 1.53; // Seguro de Invalidez y Sobrevivencia
export const MUTUALIDAD_DEFAULT_RATE = 0.95; // Default work accident insurance

// ─── Fonasa legal rate ──────────────────────────────────────────────────────
export const FONASA_RATE = 7.0;

// ─── Chilean 2nd-Category Income Tax Brackets (Impuesto Unico) ──────────────
// Brackets expressed in UTM. Factor is marginal rate, amount to deduct in UTM.
// Source: SII — Art. 43 No 1, Ley sobre Impuesto a la Renta
export interface TaxBracket {
  fromUtm: number;
  toUtm: number;
  rate: number; // decimal, e.g. 0.04 = 4%
  deductUtm: number;
}

export const TAX_BRACKETS: TaxBracket[] = [
  { fromUtm: 0.0, toUtm: 13.5, rate: 0.0, deductUtm: 0.0 },
  { fromUtm: 13.5, toUtm: 30.0, rate: 0.04, deductUtm: 0.54 },
  { fromUtm: 30.0, toUtm: 50.0, rate: 0.08, deductUtm: 1.74 },
  { fromUtm: 50.0, toUtm: 70.0, rate: 0.135, deductUtm: 4.49 },
  { fromUtm: 70.0, toUtm: 90.0, rate: 0.23, deductUtm: 11.14 },
  { fromUtm: 90.0, toUtm: 120.0, rate: 0.304, deductUtm: 17.80 },
  { fromUtm: 120.0, toUtm: 310.0, rate: 0.35, deductUtm: 23.32 },
  { fromUtm: 310.0, toUtm: Infinity, rate: 0.40, deductUtm: 38.82 },
];

// ─── Ingreso Minimo Mensual (2024) ─────────────────────────────────────────
export const INGRESO_MINIMO_DEFAULT = 500000; // CLP — update per year

/**
 * Calculate Impuesto Unico de Segunda Categoría.
 * @param taxableBase - Renta tributable = totalImponible - AFP - Salud - SeguroCesantia
 * @param utmValue   - Value of 1 UTM in CLP for the month
 * @returns Tax amount in CLP (rounded to integer)
 */
export function calculateImpuestoUnico(taxableBase: number, utmValue: number): number {
  if (taxableBase <= 0 || utmValue <= 0) return 0;

  const baseInUtm = taxableBase / utmValue;

  for (const bracket of TAX_BRACKETS) {
    if (baseInUtm > bracket.fromUtm && baseInUtm <= bracket.toUtm) {
      const tax = (baseInUtm * bracket.rate - bracket.deductUtm) * utmValue;
      return Math.round(Math.max(tax, 0));
    }
  }

  // If above last bracket upper bound (Infinity), use last bracket
  const last = TAX_BRACKETS[TAX_BRACKETS.length - 1];
  const tax = (baseInUtm * last.rate - last.deductUtm) * utmValue;
  return Math.round(Math.max(tax, 0));
}

/**
 * Calculate Gratificación Legal — Artículo 47 (monthly tope).
 * Art. 47: employer pays 25% of salary, capped at 4.75 IMM / 12 per month.
 * @param baseSalary   - Sueldo base mensual
 * @param ingresoMinimo - Ingreso Mínimo Mensual
 * @returns Gratification amount in CLP
 */
export function calculateGratificacionArt47(
  baseSalary: number,
  ingresoMinimo: number,
): number {
  const twentyFivePercent = baseSalary * 0.25;
  const tope = (4.75 * ingresoMinimo) / 12;
  return Math.round(Math.min(twentyFivePercent, tope));
}

/**
 * Calculate Overtime (Horas Extra).
 * Chilean law: overtime pays 1.5x the normal hourly rate.
 * Hourly rate = (sueldoBase / 30) / (weeklyHours / 7)
 *             = sueldoBase * 7 / (30 * weeklyHours)
 * @param baseSalary  - Monthly base salary
 * @param weeklyHours - Agreed weekly hours (usually 45)
 * @param extraHours  - Number of extra hours worked
 * @returns Overtime amount in CLP
 */
export function calculateHorasExtra(
  baseSalary: number,
  weeklyHours: number,
  extraHours: number,
): number {
  if (extraHours <= 0 || weeklyHours <= 0) return 0;
  const hourlyRate = (baseSalary * 7) / (30 * weeklyHours);
  return Math.round(hourlyRate * 1.5 * extraHours);
}

/**
 * Apply tope imponible: cap the base at (topeUf * ufValue).
 */
export function applyTope(base: number, topeUf: number, ufValue: number): number {
  const cap = topeUf * ufValue;
  return Math.min(base, cap);
}

/**
 * Calculate Fonasa contribution (always 7% of total imponible, subject to tope).
 */
export function calculateFonasa(totalImponible: number, ufValue: number): number {
  const baseCapped = applyTope(totalImponible, TOPES_IMPONIBLES.SALUD, ufValue);
  return Math.round(baseCapped * (FONASA_RATE / 100));
}

/**
 * Calculate ISAPRE contribution.
 * The employee pays the greater of 7% legal or the plan cost.
 * The difference (if plan cost > 7%) is the "additional" paid by the employee.
 * Returns { saludAmount, saludAdicional }.
 * saludAmount = legal 7%; saludAdicional = extra above 7% for the ISAPRE plan.
 */
export function calculateIsapre(
  totalImponible: number,
  isaprePlanUf: number,
  ufValue: number,
): { saludAmount: number; saludAdicional: number } {
  const baseCapped = applyTope(totalImponible, TOPES_IMPONIBLES.SALUD, ufValue);
  const legalAmount = Math.round(baseCapped * (FONASA_RATE / 100));
  const planCost = Math.round(isaprePlanUf * ufValue);

  if (planCost <= legalAmount) {
    // Plan costs less than or equal to legal 7% — no additional
    return { saludAmount: legalAmount, saludAdicional: 0 };
  }

  // Employee pays full plan cost: legal portion + additional difference
  return {
    saludAmount: legalAmount,
    saludAdicional: planCost - legalAmount,
  };
}

/**
 * Calculate AFP contribution.
 */
export function calculateAfp(
  totalImponible: number,
  afpRatePercent: number,
  ufValue: number,
): number {
  const baseCapped = applyTope(totalImponible, TOPES_IMPONIBLES.AFP, ufValue);
  return Math.round(baseCapped * (afpRatePercent / 100));
}

/**
 * Calculate Seguro de Cesantía — employee portion.
 */
export function calculateSeguroCesantiaEmpleado(
  totalImponible: number,
  contractType: string,
  ufValue: number,
): number {
  const baseCapped = applyTope(totalImponible, TOPES_IMPONIBLES.SEGURO_CESANTIA, ufValue);
  const key = contractType === 'INDEFINIDO' ? 'INDEFINIDO' : 'PLAZO_FIJO';
  const rate = SEGURO_CESANTIA[key].empleado;
  return Math.round(baseCapped * (rate / 100));
}

/**
 * Calculate Seguro de Cesantía — employer portion.
 */
export function calculateSeguroCesantiaEmpleador(
  totalImponible: number,
  contractType: string,
  ufValue: number,
): number {
  const baseCapped = applyTope(totalImponible, TOPES_IMPONIBLES.SEGURO_CESANTIA, ufValue);
  const key = contractType === 'INDEFINIDO' ? 'INDEFINIDO' : 'PLAZO_FIJO';
  const rate = SEGURO_CESANTIA[key].empleador;
  return Math.round(baseCapped * (rate / 100));
}

/**
 * Calculate SIS — employer cost.
 */
export function calculateSis(totalImponible: number, ufValue: number): number {
  const baseCapped = applyTope(totalImponible, TOPES_IMPONIBLES.AFP, ufValue);
  return Math.round(baseCapped * (SIS_RATE / 100));
}

/**
 * Calculate Mutualidad — employer cost.
 */
export function calculateMutualidad(
  totalImponible: number,
  ufValue: number,
  rate: number = MUTUALIDAD_DEFAULT_RATE,
): number {
  const baseCapped = applyTope(totalImponible, TOPES_IMPONIBLES.AFP, ufValue);
  return Math.round(baseCapped * (rate / 100));
}

/**
 * Full payroll line calculation for a single employee.
 * Returns all computed fields ready for PayrollDetail entity.
 */
export interface PayrollLineInput {
  baseSalary: number;
  gratificationType: string;
  colacionAmount: number;
  movilizacionAmount: number;
  horasExtra: number;
  weeklyHours: number;
  bonos: number;
  comisiones: number;
  otrosHaberes: number;
  healthSystem: string;
  isaprePlanUf: number;
  afpRate: number;
  contractType: string;
  apvAmount: number;
  anticipos: number;
  prestamos: number;
  otrosDescuentos: number;
  daysWorked: number;
  daysAbsent: number;
  ufValue: number;
  utmValue: number;
  ingresoMinimo: number;
  mutualidadRate?: number;
}

export interface PayrollLineResult {
  sueldoBase: number;
  gratificacion: number;
  horasExtra: number;
  montoHorasExtra: number;
  bonos: number;
  comisiones: number;
  colacion: number;
  movilizacion: number;
  otrosHaberes: number;
  totalImponible: number;
  totalNoImponible: number;
  totalHaberes: number;
  afpRate: number;
  afpAmount: number;
  saludRate: number;
  saludAmount: number;
  saludAdicionalIsapre: number;
  seguroCesantiaRate: number;
  seguroCesantiaAmount: number;
  impuestoUnico: number;
  apvAmount: number;
  anticipos: number;
  prestamos: number;
  otrosDescuentos: number;
  totalDescuentos: number;
  seguroCesantiaEmpleador: number;
  sis: number;
  mutualidad: number;
  totalCostoEmpleador: number;
  sueldoLiquido: number;
  costoTotalEmpresa: number;
  daysWorked: number;
  daysAbsent: number;
}

export function calculatePayrollLine(input: PayrollLineInput): PayrollLineResult {
  // ── Proportion factor for partial months ──────────────────────────
  const proportion = input.daysWorked / 30;

  // ── Haberes ───────────────────────────────────────────────────────
  const sueldoBase = Math.round(input.baseSalary * proportion);

  const gratificacion =
    input.gratificationType === 'ARTICULO_47'
      ? Math.round(calculateGratificacionArt47(sueldoBase, input.ingresoMinimo))
      : 0; // Art. 50 requires annual utility data — calculated at year-end

  const montoHorasExtra = calculateHorasExtra(
    input.baseSalary,
    input.weeklyHours,
    input.horasExtra,
  );

  const colacion = Math.round(input.colacionAmount * proportion);
  const movilizacion = Math.round(input.movilizacionAmount * proportion);

  // Imponible = sueldo base + gratificacion + horas extra + bonos + comisiones + otros haberes
  const totalImponible =
    sueldoBase + gratificacion + montoHorasExtra + input.bonos + input.comisiones + input.otrosHaberes;

  // No imponible = colación + movilización
  const totalNoImponible = colacion + movilizacion;

  const totalHaberes = totalImponible + totalNoImponible;

  // ── Descuentos Legales ────────────────────────────────────────────
  const afpAmount = calculateAfp(totalImponible, input.afpRate, input.ufValue);

  let saludAmount: number;
  let saludAdicionalIsapre = 0;
  let saludRate: number;

  if (input.healthSystem === 'ISAPRE') {
    const isapre = calculateIsapre(totalImponible, input.isaprePlanUf, input.ufValue);
    saludAmount = isapre.saludAmount;
    saludAdicionalIsapre = isapre.saludAdicional;
    saludRate = FONASA_RATE;
  } else {
    saludAmount = calculateFonasa(totalImponible, input.ufValue);
    saludRate = FONASA_RATE;
  }

  const seguroCesantiaAmount = calculateSeguroCesantiaEmpleado(
    totalImponible,
    input.contractType,
    input.ufValue,
  );
  const seguroCesantiaRate =
    input.contractType === 'INDEFINIDO'
      ? SEGURO_CESANTIA.INDEFINIDO.empleado
      : SEGURO_CESANTIA.PLAZO_FIJO.empleado;

  // Taxable base for income tax = totalImponible - AFP - salud (legal) - seguro cesantia
  const taxableBase = totalImponible - afpAmount - saludAmount - saludAdicionalIsapre - seguroCesantiaAmount;
  const impuestoUnico = calculateImpuestoUnico(taxableBase, input.utmValue);

  // Voluntary deductions
  const apvAmount = Math.round(input.apvAmount);
  const anticipos = Math.round(input.anticipos);
  const prestamos = Math.round(input.prestamos);
  const otrosDescuentos = Math.round(input.otrosDescuentos);

  const totalDescuentos =
    afpAmount +
    saludAmount +
    saludAdicionalIsapre +
    seguroCesantiaAmount +
    impuestoUnico +
    apvAmount +
    anticipos +
    prestamos +
    otrosDescuentos;

  // ── Aportes Empleador ─────────────────────────────────────────────
  const seguroCesantiaEmpleador = calculateSeguroCesantiaEmpleador(
    totalImponible,
    input.contractType,
    input.ufValue,
  );
  const sis = calculateSis(totalImponible, input.ufValue);
  const mutualidad = calculateMutualidad(
    totalImponible,
    input.ufValue,
    input.mutualidadRate ?? MUTUALIDAD_DEFAULT_RATE,
  );
  const totalCostoEmpleador = seguroCesantiaEmpleador + sis + mutualidad;

  // ── Result ────────────────────────────────────────────────────────
  const sueldoLiquido = totalHaberes - totalDescuentos;
  const costoTotalEmpresa = totalHaberes + totalCostoEmpleador;

  return {
    sueldoBase,
    gratificacion,
    horasExtra: input.horasExtra,
    montoHorasExtra,
    bonos: input.bonos,
    comisiones: input.comisiones,
    colacion,
    movilizacion,
    otrosHaberes: input.otrosHaberes,
    totalImponible,
    totalNoImponible,
    totalHaberes,
    afpRate: input.afpRate,
    afpAmount,
    saludRate,
    saludAmount,
    saludAdicionalIsapre,
    seguroCesantiaRate,
    seguroCesantiaAmount,
    impuestoUnico,
    apvAmount,
    anticipos,
    prestamos,
    otrosDescuentos,
    totalDescuentos,
    seguroCesantiaEmpleador,
    sis,
    mutualidad,
    totalCostoEmpleador,
    sueldoLiquido,
    costoTotalEmpresa,
    daysWorked: input.daysWorked,
    daysAbsent: input.daysAbsent,
  };
}
