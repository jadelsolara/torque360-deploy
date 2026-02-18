import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { Subscription } from '../../database/entities/subscription.entity';
import { Tenant } from '../../database/entities/tenant.entity';

const PLANS = {
  starter: { name: 'Starter', priceClp: 0, priceUsd: 0 },
  pro: { name: 'Pro', priceClp: 149_990, priceUsd: 149 },
  enterprise: { name: 'Enterprise', priceClp: 399_990, priceUsd: 399 },
} as const;

@Injectable()
export class BillingService {
  private stripe: Stripe | null = null;
  private mpClient: MercadoPagoConfig | null = null;

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Tenant)
    private readonly tenantRepo: Repository<Tenant>,
    private readonly config: ConfigService,
  ) {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY');
    if (stripeKey) {
      this.stripe = new Stripe(stripeKey);
    }

    const mpToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (mpToken) {
      this.mpClient = new MercadoPagoConfig({ accessToken: mpToken });
    }
  }

  getPlans() {
    return Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
    }));
  }

  async getSubscription(tenantId: string): Promise<Subscription | null> {
    return this.subscriptionRepo.findOne({ where: { tenantId } });
  }

  async createCheckout(
    tenantId: string,
    plan: string,
    provider: string,
    successUrl?: string,
    cancelUrl?: string,
  ) {
    const planConfig = PLANS[plan as keyof typeof PLANS];
    if (!planConfig) {
      throw new BadRequestException(`Invalid plan: ${plan}`);
    }

    if (plan === 'starter') {
      throw new BadRequestException('Starter plan is free, no checkout needed');
    }

    if (provider === 'stripe') {
      return this.createStripeCheckout(tenantId, plan, planConfig, successUrl, cancelUrl);
    }

    if (provider === 'mercadopago') {
      return this.createMercadoPagoCheckout(tenantId, plan, planConfig, successUrl, cancelUrl);
    }

    throw new BadRequestException(`Unsupported provider: ${provider}`);
  }

  async handleStripeWebhook(payload: Buffer, signature: string) {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');

    const webhookSecret = this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET');
    const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleStripeCheckoutComplete(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.handleStripeSubscriptionUpdate(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.handleStripeSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleStripePaymentFailed(event.data.object);
        break;
    }

    return { received: true };
  }

  async handleMercadoPagoWebhook(body: Record<string, unknown>) {
    const type = body.type as string;
    const dataId = (body.data as Record<string, unknown>)?.id as string;

    if (type === 'payment' && dataId) {
      await this.handleMercadoPagoPayment(dataId);
    }

    return { received: true };
  }

  async cancelSubscription(tenantId: string) {
    const subscription = await this.subscriptionRepo.findOne({ where: { tenantId } });
    if (!subscription) throw new NotFoundException('No active subscription');

    if (subscription.provider === 'stripe' && this.stripe && subscription.providerSubscriptionId) {
      await this.stripe.subscriptions.update(subscription.providerSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    subscription.cancelAtPeriodEnd = true;
    return this.subscriptionRepo.save(subscription);
  }

  // ---- Stripe ----

  private async createStripeCheckout(
    tenantId: string,
    plan: string,
    planConfig: (typeof PLANS)[keyof typeof PLANS],
    successUrl?: string,
    cancelUrl?: string,
  ) {
    if (!this.stripe) throw new BadRequestException('Stripe not configured');

    const priceId = this.config.get<string>(`STRIPE_PRICE_${plan.toUpperCase()}`);
    if (!priceId) throw new BadRequestException(`Stripe price not configured for plan: ${plan}`);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${this.config.get('APP_URL')}/billing?success=true`,
      cancel_url: cancelUrl || `${this.config.get('APP_URL')}/billing?canceled=true`,
      metadata: { tenantId, plan },
      subscription_data: { metadata: { tenantId, plan } },
    });

    return { url: session.url, sessionId: session.id };
  }

  private async handleStripeCheckoutComplete(session: Stripe.Checkout.Session) {
    const tenantId = session.metadata?.tenantId;
    const plan = session.metadata?.plan;
    if (!tenantId || !plan) return;

    const subscription = await this.stripe!.subscriptions.retrieve(
      session.subscription as string,
    );

    await this.subscriptionRepo.upsert(
      {
        tenantId,
        plan,
        status: 'active',
        provider: 'stripe',
        providerCustomerId: session.customer as string,
        providerSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.items.data[0].current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.items.data[0].current_period_end * 1000),
        amount: subscription.items.data[0]?.price?.unit_amount
          ? subscription.items.data[0].price.unit_amount / 100
          : 0,
        currency: subscription.currency?.toUpperCase() || 'USD',
      },
      ['tenantId'],
    );

    await this.tenantRepo.update(tenantId, { plan });
  }

  private async handleStripeSubscriptionUpdate(sub: Stripe.Subscription) {
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return;

    await this.subscriptionRepo.update(
      { tenantId },
      {
        status: sub.status === 'active' ? 'active' : 'past_due',
        currentPeriodStart: new Date(sub.items.data[0].current_period_start * 1000),
        currentPeriodEnd: new Date(sub.items.data[0].current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    );
  }

  private async handleStripeSubscriptionDeleted(sub: Stripe.Subscription) {
    const tenantId = sub.metadata?.tenantId;
    if (!tenantId) return;

    await this.subscriptionRepo.update({ tenantId }, { status: 'canceled' });
    await this.tenantRepo.update(tenantId, { plan: 'starter' });
  }

  private async handleStripePaymentFailed(invoice: Stripe.Invoice) {
    const subId = invoice.parent?.subscription_details?.subscription as string | undefined;
    if (!subId) return;

    await this.subscriptionRepo.update(
      { providerSubscriptionId: subId },
      { status: 'past_due' },
    );
  }

  // ---- MercadoPago ----

  private async createMercadoPagoCheckout(
    tenantId: string,
    plan: string,
    planConfig: (typeof PLANS)[keyof typeof PLANS],
    successUrl?: string,
    cancelUrl?: string,
  ) {
    if (!this.mpClient) throw new BadRequestException('MercadoPago not configured');

    const preference = new Preference(this.mpClient);
    const result = await preference.create({
      body: {
        items: [
          {
            id: plan,
            title: `TORQUE 360 — Plan ${planConfig.name}`,
            quantity: 1,
            unit_price: planConfig.priceClp,
            currency_id: 'CLP',
          },
        ],
        back_urls: {
          success: successUrl || `${this.config.get('APP_URL')}/billing?success=true`,
          failure: cancelUrl || `${this.config.get('APP_URL')}/billing?canceled=true`,
          pending: `${this.config.get('APP_URL')}/billing?pending=true`,
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({ tenantId, plan }),
        notification_url: `${this.config.get('API_URL')}/api/billing/webhooks/mercadopago`,
      },
    });

    return { url: result.init_point, preferenceId: result.id };
  }

  private async handleMercadoPagoPayment(paymentId: string) {
    if (!this.mpClient) return;

    const { default: MpPayment } = await import('mercadopago');
    const paymentClient = new (MpPayment as any).Payment(this.mpClient);
    const payment = await paymentClient.get({ id: paymentId });

    if (payment.status !== 'approved') return;

    let ref: { tenantId: string; plan: string };
    try {
      ref = JSON.parse(payment.external_reference);
    } catch {
      return;
    }

    await this.subscriptionRepo.upsert(
      {
        tenantId: ref.tenantId,
        plan: ref.plan,
        status: 'active',
        provider: 'mercadopago',
        providerCustomerId: String(payment.payer?.id || ''),
        providerSubscriptionId: String(payment.id),
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        amount: payment.transaction_amount,
        currency: 'CLP',
      },
      ['tenantId'],
    );

    await this.tenantRepo.update(ref.tenantId, { plan: ref.plan });
  }
}
