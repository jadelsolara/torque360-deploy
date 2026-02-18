import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.headers?.authorization?.replace('Bearer ', '') as string);

      if (!token) {
        this.logger.warn(`Client ${client.id} rejected: no token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });

      const tenantId = payload.tenantId as string;
      if (!tenantId) {
        this.logger.warn(`Client ${client.id} rejected: no tenantId in token`);
        client.emit('error', { message: 'Invalid token: missing tenantId' });
        client.disconnect(true);
        return;
      }

      // Store user info on socket for later use
      client.data.userId = payload.sub;
      client.data.tenantId = tenantId;
      client.data.role = payload.role;

      client.join(`tenant:${tenantId}`);
      this.logger.debug(
        `Client connected: ${client.id} (user: ${payload.sub}, tenant: ${tenantId})`,
      );
    } catch {
      this.logger.warn(`Client ${client.id} rejected: invalid token`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  // ── Emit helpers ──────────────────────────────────────────────────────

  emitToTenant(tenantId: string, event: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload);
  }

  emitToAll(event: string, payload: unknown) {
    this.server.emit(event, payload);
  }

  // ── Domain Events ─────────────────────────────────────────────────────

  notifyWorkOrderUpdate(tenantId: string, workOrderId: string, status: string) {
    this.emitToTenant(tenantId, 'work-order:updated', { workOrderId, status });
  }

  notifyInventoryAlert(tenantId: string, itemId: string, type: 'low_stock' | 'out_of_stock') {
    this.emitToTenant(tenantId, 'inventory:alert', { itemId, type });
  }

  notifyInvoiceStatus(tenantId: string, invoiceId: string, status: string) {
    this.emitToTenant(tenantId, 'invoice:status', { invoiceId, status });
  }

  notifyNewNotification(tenantId: string, notification: Record<string, unknown>) {
    this.emitToTenant(tenantId, 'notification:new', notification);
  }
}
