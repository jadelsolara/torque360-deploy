import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';

export const PinoLoggerModule = LoggerModule.forRoot({
  pinoHttp: {
    genReqId: (req: IncomingMessage) =>
      (req.headers['x-request-id'] as string) || randomUUID(),
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
        : undefined,
    serializers: {
      req: (req) => ({
        id: req.id,
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    customProps: () => ({ service: 'torque360-api' }),
    redact: ['req.headers.authorization', 'req.headers.cookie'],
  },
});
