import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportOrder } from '../../database/entities/import-order.entity';
import { ImportOrderItem } from '../../database/entities/import-order-item.entity';
import { ExchangeRateService } from './exchange-rate.service';

const IVA_RATE = 0.19;
const DEFAULT_ARANCEL_RATE = 0.06;

export interface CostBreakdown {
  orderId: string;
  orderNumber: number;
  currency: string;
  exchangeRateUsed: number;
  exchangeRateSource: string;

  // USD costs
  fobTotalUsd: number;
  freightCostUsd: number;
  insuranceCostUsd: number;
  cifTotalUsd: number;

  // CLP costs
  cifClp: number;
  arancelRate: number;
  arancelAmount: number;
  ivaImportacion: number;
  gastosPuerto: number;
  agenteAduana: number;
  transporteInterno: number;
  otrosGastos: number;

  // Totals
  totalLandedCostClp: number;
  totalLandedCostUsd: number;
  totalUnits: number;
  costPerUnitClp: number;
  costPerUnitUsd: number;

  // Percentage breakdown
  percentages: {
    fob: number;
    freight: number;
    insurance: number;
    arancel: number;
    iva: number;
    puerto: number;
    aduana: number;
    transporte: number;
    otros: number;
  };

  // Per-item breakdown
  items: ItemCostBreakdown[];
}

export interface ItemCostBreakdown {
  itemId: string;
  description: string;
  partNumber: string;
  hsCode: string;
  quantity: number;
  unitPriceUsd: number;
  totalFobUsd: number;
  arancelRate: number;
  fobProportion: number;
  landedCostPerUnit: number;
  totalLandedCost: number;
}

export interface RateComparison {
  orderId: string;
  orderNumber: number;
  rateAtOrder: number;
  rateAtCustoms: number;
  rateCurrent: number;
  landedCostAtOrderRate: number;
  landedCostAtCustomsRate: number;
  landedCostAtCurrentRate: number;
  differenceOrderVsCurrent: number;
  differencePercentage: number;
  favorableDirection: string;
}

@Injectable()
export class LandedCostService {
  constructor(
    @InjectRepository(ImportOrder)
    private orderRepo: Repository<ImportOrder>,
    @InjectRepository(ImportOrderItem)
    private itemRepo: Repository<ImportOrderItem>,
    private exchangeRateService: ExchangeRateService,
  ) {}

  /**
   * Full landed cost calculation for a Chilean auto parts import order.
   *
   * Calculation chain:
   * 1. Sum all item FOB totals = totalFob (USD)
   * 2. FOB + Freight + Insurance = CIF (USD)
   * 3. CIF * exchangeRate = CIF (CLP)
   * 4. CIF_CLP * arancelRate = Arancel Aduanero (per item if HS codes differ)
   * 5. (CIF_CLP + Arancel) * 19% = IVA Importacion
   * 6. + Port charges + Customs broker + Inland transport + Other
   * 7. = Total Landed Cost CLP
   * 8. Distribute to items proportionally by FOB value
   * 9. Calculate per-unit costs
   * 10. Update import order totals
   */
  async calculateLandedCost(
    tenantId: string,
    importOrderId: string,
  ): Promise<CostBreakdown> {
    const order = await this.orderRepo.findOne({
      where: { id: importOrderId, tenantId },
      relations: ['items'],
    });

    if (!order) throw new NotFoundException('Import order not found');

    const items = order.items || [];
    if (items.length === 0) {
      throw new BadRequestException('Import order has no items');
    }

    // Step 1: Determine the exchange rate to use
    let exchangeRate: number;
    let exchangeRateSource: string;

    // Fetch the latest rate, or use stored exchange rate
    {
      const latestRate = await this.exchangeRateService.getLatestRate('USD');
      if (latestRate) {
        exchangeRate = Number(latestRate.observedRate);
        exchangeRateSource = `${latestRate.source}_${latestRate.date}`;
      } else if (order.exchangeRate) {
        exchangeRate = Number(order.exchangeRate);
        exchangeRateSource = 'legacy_rate';
      } else {
        throw new BadRequestException(
          'No exchange rate available. Please set a rate manually or fetch from mindicador.cl',
        );
      }
    }

    // Step 2: Calculate FOB total from items
    const fobTotalUsd = items.reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0,
    );

    // Step 3: Calculate CIF in USD
    const freightCostUsd = Number(order.freightCost) || 0;
    const insuranceCostUsd = Number(order.insuranceCost) || 0;
    const cifTotalUsd = fobTotalUsd + freightCostUsd + insuranceCostUsd;

    // Step 4: Convert CIF to CLP
    const cifClp = cifTotalUsd * exchangeRate;

    // Step 5: Calculate arancel (customs duty)
    // If items have different HS codes, they might have different arancel rates
    // Calculate weighted arancel
    let totalArancelAmount = 0;
    const itemBreakdowns: ItemCostBreakdown[] = [];

    for (const item of items) {
      const itemFobUsd = Number(item.totalPrice || 0);
      const itemArancelRate = DEFAULT_ARANCEL_RATE;
      const fobProportion = fobTotalUsd > 0 ? itemFobUsd / fobTotalUsd : 0;

      // Item's share of CIF in CLP
      const itemCifClp = cifClp * fobProportion;

      // Item's arancel
      const itemArancelAmount = itemCifClp * itemArancelRate;
      totalArancelAmount += itemArancelAmount;

      itemBreakdowns.push({
        itemId: item.id,
        description: item.description,
        partNumber: '',
        hsCode: item.hsCode || '',
        quantity: Number(item.quantity),
        unitPriceUsd: Number(item.unitPrice),
        totalFobUsd: itemFobUsd,
        arancelRate: itemArancelRate,
        fobProportion,
        landedCostPerUnit: 0, // Will be calculated below
        totalLandedCost: 0, // Will be calculated below
      });
    }

    // Step 6: Calculate IVA Importacion = 19% of (CIF_CLP + Arancel)
    const ivaImportacion = (cifClp + totalArancelAmount) * IVA_RATE;

    // Step 7: Sum all CLP costs
    const gastosPuerto = 0;
    const agenteAduana = 0;
    const transporteInterno = 0;
    const otrosGastos = Number(order.otherCosts) || 0;

    // Step 8: Total Landed Cost CLP
    const totalLandedCostClp =
      cifClp +
      totalArancelAmount +
      ivaImportacion +
      gastosPuerto +
      agenteAduana +
      transporteInterno +
      otrosGastos;

    // Total landed cost in USD at current rate
    const totalLandedCostUsd = exchangeRate > 0 ? totalLandedCostClp / exchangeRate : 0;

    // Step 9: Calculate total units
    const totalUnits = items.reduce((sum, item) => sum + Number(item.quantity), 0);

    // Step 10: Per-unit costs
    const costPerUnitClp = totalUnits > 0 ? totalLandedCostClp / totalUnits : 0;
    const costPerUnitUsd = totalUnits > 0 ? totalLandedCostUsd / totalUnits : 0;

    // Step 11: Distribute landed cost to items proportionally by FOB value
    for (const itemBreakdown of itemBreakdowns) {
      const itemTotalLanded = totalLandedCostClp * itemBreakdown.fobProportion;
      itemBreakdown.totalLandedCost = Math.round(itemTotalLanded * 100) / 100;
      itemBreakdown.landedCostPerUnit =
        itemBreakdown.quantity > 0
          ? Math.round((itemTotalLanded / itemBreakdown.quantity) * 10000) / 10000
          : 0;
    }

    // Step 12: Update items in database with landed unit cost
    for (const itemBreakdown of itemBreakdowns) {
      await this.itemRepo.update(itemBreakdown.itemId, {
        landedUnitCost: itemBreakdown.landedCostPerUnit,
      });
    }

    // Effective weighted arancel rate
    const effectiveArancelRate = cifClp > 0 ? totalArancelAmount / cifClp : DEFAULT_ARANCEL_RATE;

    // Step 13: Update order with calculated values
    await this.orderRepo.update(order.id, {
      fobTotal: Math.round(fobTotalUsd * 100) / 100,
      freightCost: Math.round(freightCostUsd * 100) / 100,
      insuranceCost: Math.round(insuranceCostUsd * 100) / 100,
      cifTotal: Math.round(cifTotalUsd * 100) / 100,
      exchangeRate: exchangeRate,
      customsDuty: Math.round(totalArancelAmount * 100) / 100,
      customsTax: Math.round(ivaImportacion * 100) / 100,
      otherCosts: Math.round(otrosGastos * 100) / 100,
      landedCostTotal: Math.round(totalLandedCostClp * 100) / 100,
    });

    // Calculate percentages
    const percentages = {
      fob: totalLandedCostClp > 0 ? ((fobTotalUsd * exchangeRate) / totalLandedCostClp) * 100 : 0,
      freight: totalLandedCostClp > 0 ? ((freightCostUsd * exchangeRate) / totalLandedCostClp) * 100 : 0,
      insurance: totalLandedCostClp > 0 ? ((insuranceCostUsd * exchangeRate) / totalLandedCostClp) * 100 : 0,
      arancel: totalLandedCostClp > 0 ? (totalArancelAmount / totalLandedCostClp) * 100 : 0,
      iva: totalLandedCostClp > 0 ? (ivaImportacion / totalLandedCostClp) * 100 : 0,
      puerto: totalLandedCostClp > 0 ? (gastosPuerto / totalLandedCostClp) * 100 : 0,
      aduana: totalLandedCostClp > 0 ? (agenteAduana / totalLandedCostClp) * 100 : 0,
      transporte: totalLandedCostClp > 0 ? (transporteInterno / totalLandedCostClp) * 100 : 0,
      otros: totalLandedCostClp > 0 ? (otrosGastos / totalLandedCostClp) * 100 : 0,
    };

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      currency: order.currency || 'USD',
      exchangeRateUsed: exchangeRate,
      exchangeRateSource,
      fobTotalUsd: Math.round(fobTotalUsd * 100) / 100,
      freightCostUsd: Math.round(freightCostUsd * 100) / 100,
      insuranceCostUsd: Math.round(insuranceCostUsd * 100) / 100,
      cifTotalUsd: Math.round(cifTotalUsd * 100) / 100,
      cifClp: Math.round(cifClp * 100) / 100,
      arancelRate: effectiveArancelRate,
      arancelAmount: Math.round(totalArancelAmount * 100) / 100,
      ivaImportacion: Math.round(ivaImportacion * 100) / 100,
      gastosPuerto,
      agenteAduana,
      transporteInterno,
      otrosGastos,
      totalLandedCostClp: Math.round(totalLandedCostClp * 100) / 100,
      totalLandedCostUsd: Math.round(totalLandedCostUsd * 100) / 100,
      totalUnits,
      costPerUnitClp: Math.round(costPerUnitClp * 10000) / 10000,
      costPerUnitUsd: Math.round(costPerUnitUsd * 10000) / 10000,
      percentages,
      items: itemBreakdowns,
    };
  }

  /**
   * Recalculates the landed cost using today's exchange rate.
   * Useful for live monitoring before customs clearance.
   */
  async recalculateWithCurrentRate(
    tenantId: string,
    importOrderId: string,
  ): Promise<CostBreakdown> {
    // Fetch the latest rate and store it temporarily
    const latestRate = await this.exchangeRateService.getLatestRate('USD');
    if (latestRate) {
      await this.orderRepo.update(importOrderId, {
        exchangeRate: Number(latestRate.observedRate),
      });
    }

    return this.calculateLandedCost(tenantId, importOrderId);
  }

  /**
   * Returns a detailed cost breakdown for an import order.
   */
  async getCostBreakdown(
    tenantId: string,
    importOrderId: string,
  ): Promise<CostBreakdown> {
    return this.calculateLandedCost(tenantId, importOrderId);
  }

  /**
   * Compare landed costs at different exchange rates:
   * - Rate at the time the order was placed
   * - Rate at customs clearance
   * - Current rate
   */
  async compareRates(
    tenantId: string,
    importOrderId: string,
  ): Promise<RateComparison> {
    const order = await this.orderRepo.findOne({
      where: { id: importOrderId, tenantId },
      relations: ['items'],
    });

    if (!order) throw new NotFoundException('Import order not found');

    const items = order.items || [];
    const fobTotalUsd = items.reduce(
      (sum, item) => sum + Number(item.totalPrice || 0),
      0,
    );
    const freightCostUsd = Number(order.freightCost) || 0;
    const insuranceCostUsd = Number(order.insuranceCost) || 0;
    const cifTotalUsd = fobTotalUsd + freightCostUsd + insuranceCostUsd;

    const gastosPuerto = 0;
    const agenteAduana = 0;
    const transporteInterno = 0;
    const otrosGastos = Number(order.otherCosts) || 0;
    const additionalCostsClp = gastosPuerto + agenteAduana + transporteInterno + otrosGastos;

    const arancelRate = DEFAULT_ARANCEL_RATE; // arancelRate not in import_orders table

    // Helper to calculate total landed cost at a given rate
    const calcLanded = (rate: number): number => {
      if (!rate || rate <= 0) return 0;
      const cifClp = cifTotalUsd * rate;
      const arancelAmount = cifClp * arancelRate;
      const iva = (cifClp + arancelAmount) * IVA_RATE;
      return cifClp + arancelAmount + iva + additionalCostsClp;
    };

    const rateAtOrder = Number(order.exchangeRate) || 0;
    const rateAtCustoms = 0;

    // Fetch current rate
    const latestRate = await this.exchangeRateService.getLatestRate('USD');
    const rateCurrent = latestRate ? Number(latestRate.observedRate) : 0;

    const landedAtOrder = calcLanded(rateAtOrder);
    const landedAtCustoms = calcLanded(rateAtCustoms);
    const landedAtCurrent = calcLanded(rateCurrent);

    const referenceRate = rateAtOrder || rateCurrent;
    const referenceLanded = landedAtOrder || landedAtCurrent;
    const difference = landedAtCurrent - referenceLanded;
    const differencePercentage =
      referenceLanded > 0 ? (difference / referenceLanded) * 100 : 0;

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      rateAtOrder,
      rateAtCustoms,
      rateCurrent,
      landedCostAtOrderRate: Math.round(landedAtOrder * 100) / 100,
      landedCostAtCustomsRate: Math.round(landedAtCustoms * 100) / 100,
      landedCostAtCurrentRate: Math.round(landedAtCurrent * 100) / 100,
      differenceOrderVsCurrent: Math.round(difference * 100) / 100,
      differencePercentage: Math.round(differencePercentage * 100) / 100,
      favorableDirection:
        difference > 0
          ? 'UNFAVORABLE (dolar subio, costo mayor)'
          : difference < 0
            ? 'FAVORABLE (dolar bajo, costo menor)'
            : 'NEUTRAL',
    };
  }
}
