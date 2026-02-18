import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Delete,
  UseGuards,
  RawBodyRequest,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './billing.dto';
import { Roles, Tenant } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('plans')
  getPlans() {
    return this.billingService.getPlans();
  }

  @Get('subscription')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  getSubscription(@Tenant() tenantId: string) {
    return this.billingService.getSubscription(tenantId);
  }

  @Post('checkout')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  createCheckout(
    @Body() dto: CreateCheckoutDto,
    @Tenant() tenantId: string,
  ) {
    return this.billingService.createCheckout(
      tenantId,
      dto.plan,
      dto.provider,
      dto.successUrl,
      dto.cancelUrl,
    );
  }

  @Delete('subscription')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  cancelSubscription(@Tenant() tenantId: string) {
    return this.billingService.cancelSubscription(tenantId);
  }

  @Post('webhooks/stripe')
  @SkipThrottle()
  handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.billingService.handleStripeWebhook(req.rawBody!, signature);
  }

  @Post('webhooks/mercadopago')
  @SkipThrottle()
  handleMercadoPagoWebhook(@Body() body: Record<string, unknown>) {
    return this.billingService.handleMercadoPagoWebhook(body);
  }
}
