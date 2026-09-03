import { WebSocket, WebSocketServer } from 'ws';

export interface WsEvent {
  type: 'RFQ_BROADCAST' | 'OFFER_SUBMITTED' | 'OFFER_ACCEPTED' | 'ORDER_PAID' | 'ORDER_STATUS_CHANGED' | 'PAYMENT_SETTLED';
  payload: any;
  targetLocationId?: string;
  targetBuyerId?: string;
  targetSellerId?: string;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients = new Set<{ ws: WebSocket; role?: string; locationId?: string; sellerId?: string; buyerId?: string }>();

  init(server: any) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientInfo = { ws };
      this.clients.add(clientInfo);

      ws.on('message', (message: string) => {
        try {
          const data = JSON.parse(message.toString());
          if (data.type === 'IDENTIFY') {
            Object.assign(clientInfo, {
              role: data.role,
              locationId: data.locationId,
              sellerId: data.sellerId,
              buyerId: data.buyerId,
            });
          }
        } catch (err) {
          // ignore malformed message
        }
      });

      ws.on('close', () => {
        this.clients.delete(clientInfo);
      });
    });
  }

  broadcast(event: WsEvent) {
    const payloadStr = JSON.stringify(event);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        // Filter by target if specified
        if (event.targetLocationId && client.locationId && client.locationId !== event.targetLocationId) {
          continue;
        }
        if (event.targetSellerId && client.sellerId && client.sellerId !== event.targetSellerId) {
          continue;
        }
        if (event.targetBuyerId && client.buyerId && client.buyerId !== event.targetBuyerId) {
          continue;
        }
        client.ws.send(payloadStr);
      }
    }
  }
}

export const wsManager = new WebSocketManager();
