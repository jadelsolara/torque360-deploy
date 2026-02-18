import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppLogger } from './common/logger';

async function bootstrap() {
  const logger = new AppLogger();
  const app = await NestFactory.create(AppModule, { logger });

  // ── Security Headers ──────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(cookieParser());
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id'],
    maxAge: 86400,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TORQUE 360 API')
    .setDescription(
      'Cloud-native ERP for automotive workshops — ' +
      'Work Orders, Inventory, Invoicing, HR, CRM, WMS, B2B Network',
    )
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .addTag('auth', 'Authentication & authorization')
    .addTag('work-orders', 'Service orders lifecycle')
    .addTag('inventory', 'Parts & stock management')
    .addTag('facturacion', 'Electronic invoicing (SII Chile)')
    .addTag('clients', 'Client CRM')
    .addTag('vehicles', 'Vehicle registry')
    .addTag('suppliers', 'Supplier management & accounts payable')
    .addTag('rrhh', 'Human resources & payroll')
    .addTag('dashboard', 'KPIs & analytics')
    .addTag('wms', 'Warehouse management')
    .addTag('quotations', 'Quotation management')
    .addTag('imports', 'International purchases')
    .addTag('reports', 'Reports & data exports')
    .addTag('audit', 'Audit trail')
    .addTag('network', 'TORQUE Network B2B marketplace')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('API_PORT', 3001);

  await app.listen(port);
  logger.log(`TORQUE 360 API running on port ${port}`, 'Bootstrap');
  logger.log(`Swagger docs: http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
