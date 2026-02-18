import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
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

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
  }

  handleConnection(client: Socket) {
    const tenantId = client.handshake.query.tenantId as string;
    if (tenantId) {
      client.join(`tenant:${tenantId}`);
    }
    this.logger.debug(`Client connected: ${client.id} (tenant: ${tenantId || 'none'})`);
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
