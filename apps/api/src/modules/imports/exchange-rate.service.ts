import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ExchangeRate } from '../../database/entities/exchange-rate.entity';

interface MindicadorResponse {
  version: string;
  autor: string;
  fecha: string;
  serie: Array<{
    fecha: string;
    valor: number;
  }>;
}

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    @InjectRepository(ExchangeRate)
    private rateRepo: Repository<ExchangeRate>,
  ) {}

  /**
   * Get the latest exchange rate for a currency.
   * Returns today's rate if available, otherwise the most recent one.
   */
  async getLatestRate(currency: string = 'USD'): Promise<ExchangeRate | null> {
    const today = new Date().toISOString().split('T')[0];

    // Try today first
    const todayRate = await this.rateRepo.findOne({
      where: { currency, date: today },
      order: { createdAt: 'DESC' },
    });

    if (todayRate) return todayRate;

    // Fall back to the most recent rate
    return this.rateRepo.findOne({
      where: { currency, date: LessThanOrEqual(today) },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get the exchange rate for a specific date.
   */
  async getRateForDate(currency: string, date: string): Promise<ExchangeRate | null> {
    const rate = await this.rateRepo.findOne({
      where: { currency, date },
    });

    if (rate) return rate;

    // Fall back to closest previous date
    return this.rateRepo.findOne({
      where: { currency, date: LessThanOrEqual(date) },
      order: { date: 'DESC' },
    });
  }

  /**
   * Manually update/insert a daily rate.
   */
  async updateDailyRate(
    currency: string,
    observedRate: number,
    source: string = 'MANUAL',
    date?: string,
    buyRate?: number,
    sellRate?: number,
  ): Promise<ExchangeRate> {
    const rateDate = date || new Date().toISOString().split('T')[0];

    // Check if a rate already exists for this currency+date
    const existing = await this.rateRepo.findOne({
      where: { currency, date: rateDate },
    });

    if (existing) {
      existing.observedRate = observedRate;
      existing.source = source;
      if (buyRate !== undefined) existing.buyRate = buyRate;
      if (sellRate !== undefined) existing.sellRate = sellRate;
      return this.rateRepo.save(existing) as Promise<ExchangeRate>;
    }

    const rate = this.rateRepo.create({
      currency,
      date: rateDate,
      observedRate,
      buyRate: buyRate ?? undefined,
      sellRate: sellRate ?? undefined,
      source,
    });

    return this.rateRepo.save(rate) as Promise<ExchangeRate>;
  }

  /**
   * Fetch the current USD/CLP rate from mindicador.cl API.
   * This is a free, public API that provides Chilean economic indicators.
   * Endpoint: https://mindicador.cl/api/dolar
   */
  async fetchMindicadorRate(): Promise<ExchangeRate> {
    this.logger.log('Fetching USD/CLP rate from mindicador.cl...');

    const response = await fetch('https://mindicador.cl/api/dolar');

    if (!response.ok) {
      throw new Error(`mindicador.cl API responded with status ${response.status}`);
    }

    const data: MindicadorResponse = await response.json();

    if (!data.serie || data.serie.length === 0) {
      throw new Error('No exchange rate data returned from mindicador.cl');
    }

    // The first element in the serie is the most recent rate
    const latest = data.serie[0];
    const rateValue = latest.valor;
    const rateDate = new Date(latest.fecha).toISOString().split('T')[0];

    this.logger.log(`USD/CLP rate from mindicador.cl: ${rateValue} for date ${rateDate}`);

    return this.updateDailyRate('USD', rateValue, 'MINDICADOR', rateDate);
  }

  /**
   * Get rate history for a currency over a number of days.
   */
  async getRateHistory(
    currency: string = 'USD',
    days: number = 30,
  ): Promise<ExchangeRate[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split('T')[0];

    return this.rateRepo
      .createQueryBuilder('rate')
      .where('rate.currency = :currency', { currency })
      .andWhere('rate.date >= :fromDate', { fromDate: fromDateStr })
      .orderBy('rate.date', 'DESC')
      .getMany();
  }

  /**
   * Schedule a daily fetch. This method is designed to be called from a cron job
   * or application startup to ensure there's always a current rate available.
   */
  async scheduleDailyFetch(): Promise<ExchangeRate | null> {
    try {
      return await this.fetchMindicadorRate();
    } catch (error) {
      this.logger.error(`Failed to fetch daily exchange rate: ${error.message}`);
      return null;
    }
  }
}
