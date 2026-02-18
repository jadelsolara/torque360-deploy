import {
  calculateImpuestoUnico,
  calculateGratificacionArt47,
  calculateHorasExtra,
  applyTope,
  calculateFonasa,
  calculateIsapre,
  calculateAfp,
  INGRESO_MINIMO_DEFAULT,
  FONASA_RATE,
  AFP_RATES,
  TOPES_IMPONIBLES,
} from './chilean-tax.helper';

describe('Chilean Tax Helper', () => {
  const ufValue = 37000;
  const utmValue = 65000;

  // ═══════════════════════════════════════════════════════════════════════════
  //  Gratificación Art. 47
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculateGratificacionArt47', () => {
    it('should return 25% of salary when below tope', () => {
      // For low salaries, 25% < (4.75 * IMM / 12)
      const salary = 400000;
      const result = calculateGratificacionArt47(salary, INGRESO_MINIMO_DEFAULT);
      expect(result).toBe(Math.round(salary * 0.25));
    });

    it('should cap at tope for high salaries', () => {
      const salary = 2000000;
      const tope = Math.round((4.75 * INGRESO_MINIMO_DEFAULT) / 12);
      const result = calculateGratificacionArt47(salary, INGRESO_MINIMO_DEFAULT);
      expect(result).toBe(tope);
    });

    it('should return 0 for zero salary', () => {
      const result = calculateGratificacionArt47(0, INGRESO_MINIMO_DEFAULT);
      expect(result).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Horas Extra
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculateHorasExtra', () => {
    it('should calculate 1.5x hourly rate', () => {
      const salary = 600000;
      const weeklyHours = 45;
      const extraHours = 10;
      const hourlyRate = (salary * 7) / (30 * weeklyHours);
      const expected = Math.round(hourlyRate * 1.5 * extraHours);

      const result = calculateHorasExtra(salary, weeklyHours, extraHours);

      expect(result).toBe(expected);
    });

    it('should return 0 for zero extra hours', () => {
      expect(calculateHorasExtra(600000, 45, 0)).toBe(0);
    });

    it('should return 0 for negative extra hours', () => {
      expect(calculateHorasExtra(600000, 45, -5)).toBe(0);
    });

    it('should return 0 for zero weekly hours (invalid)', () => {
      expect(calculateHorasExtra(600000, 0, 10)).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Tope Imponible
  // ═══════════════════════════════════════════════════════════════════════════

  describe('applyTope', () => {
    it('should return base when below tope', () => {
      const base = 1000000;
      const result = applyTope(base, TOPES_IMPONIBLES.AFP, ufValue);
      expect(result).toBe(base);
    });

    it('should cap at tope when base exceeds it', () => {
      const base = 50000000; // very high
      const cap = TOPES_IMPONIBLES.AFP * ufValue;
      const result = applyTope(base, TOPES_IMPONIBLES.AFP, ufValue);
      expect(result).toBe(cap);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Fonasa
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculateFonasa', () => {
    it('should calculate 7% of imponible', () => {
      const imponible = 800000;
      const expected = Math.round(imponible * (FONASA_RATE / 100));
      expect(calculateFonasa(imponible, ufValue)).toBe(expected);
    });

    it('should cap at tope for high salaries', () => {
      const imponible = 50000000;
      const capped = TOPES_IMPONIBLES.SALUD * ufValue;
      const expected = Math.round(capped * (FONASA_RATE / 100));
      expect(calculateFonasa(imponible, ufValue)).toBe(expected);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Isapre
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculateIsapre', () => {
    it('should return only legal amount when plan costs less than 7%', () => {
      const imponible = 800000;
      const cheapPlanUf = 0.5; // very cheap plan
      const result = calculateIsapre(imponible, cheapPlanUf, ufValue);

      expect(result.saludAdicional).toBe(0);
      expect(result.saludAmount).toBe(Math.round(imponible * (FONASA_RATE / 100)));
    });

    it('should calculate additional when plan costs more than 7%', () => {
      const imponible = 800000;
      const expensivePlanUf = 5; // expensive plan: 5 * 37000 = 185000
      const legalAmount = Math.round(imponible * (FONASA_RATE / 100)); // 56000
      const planCost = Math.round(expensivePlanUf * ufValue); // 185000
      const result = calculateIsapre(imponible, expensivePlanUf, ufValue);

      expect(result.saludAmount).toBe(legalAmount);
      expect(result.saludAdicional).toBe(planCost - legalAmount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  Impuesto Unico
  // ═══════════════════════════════════════════════════════════════════════════

  describe('calculateImpuestoUnico', () => {
    it('should return 0 for income below first bracket (13.5 UTM)', () => {
      const taxableBase = 13 * utmValue; // 13 UTM < 13.5 UTM threshold
      expect(calculateImpuestoUnico(taxableBase, utmValue)).toBe(0);
    });

    it('should calculate tax for second bracket (4%)', () => {
      const taxableBase = 20 * utmValue; // 20 UTM: in [13.5, 30] bracket
      const expected = Math.round(Math.max((20 * 0.04 - 0.54) * utmValue, 0));
      expect(calculateImpuestoUnico(taxableBase, utmValue)).toBe(expected);
    });

    it('should return 0 for zero or negative base', () => {
      expect(calculateImpuestoUnico(0, utmValue)).toBe(0);
      expect(calculateImpuestoUnico(-100000, utmValue)).toBe(0);
    });

    it('should return 0 for zero UTM value', () => {
      expect(calculateImpuestoUnico(1000000, 0)).toBe(0);
    });

    it('should increase tax with higher income', () => {
      const low = calculateImpuestoUnico(20 * utmValue, utmValue);
      const high = calculateImpuestoUnico(60 * utmValue, utmValue);
      expect(high).toBeGreaterThan(low);
    });
  });
});
