import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/nestjs';

@Module({})
export class SentryModule implements OnModuleInit {
  constructor(private config: ConfigService) {}

  onModuleInit() {
    const dsn = this.config.get<string>('SENTRY_DSN');
    if (!dsn) return;

    Sentry.init({
      dsn,
      environment: this.config.get('NODE_ENV', 'development'),
      tracesSampleRate: this.config.get<number>('SENTRY_TRACES_RATE', 0.1),
      release: `torque360-api@${this.config.get('npm_package_version', '0.2.0')}`,
    });
  }
}
