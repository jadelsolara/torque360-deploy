import { ConsoleLogger, Injectable, LogLevel } from '@nestjs/common';

@Injectable()
export class AppLogger extends ConsoleLogger {
  constructor() {
    super();
    const levels: LogLevel[] =
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn', 'log']
        : ['error', 'warn', 'log', 'debug', 'verbose'];
    this.setLogLevels(levels);
  }

  log(message: string, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(
        JSON.stringify({
          level: 'info',
          timestamp: new Date().toISOString(),
          context: context || this.context,
          message,
        }) + '\n',
      );
    } else {
      super.log(message, context);
    }
  }

  error(message: string, trace?: string, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      process.stderr.write(
        JSON.stringify({
          level: 'error',
          timestamp: new Date().toISOString(),
          context: context || this.context,
          message,
          trace,
        }) + '\n',
      );
    } else {
      super.error(message, trace, context);
    }
  }

  warn(message: string, context?: string) {
    if (process.env.NODE_ENV === 'production') {
      process.stdout.write(
        JSON.stringify({
          level: 'warn',
          timestamp: new Date().toISOString(),
          context: context || this.context,
          message,
        }) + '\n',
      );
    } else {
      super.warn(message, context);
    }
  }
}
