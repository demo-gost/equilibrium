import { Response } from 'express';
import logger from './logger';

interface SSEClient {
  userId: string;
  res: Response;
  connectedAt: Date;
}

interface SSEEvent {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Server-Sent Events Manager
 * Maintains a registry of connected SSE clients and broadcasts events
 */
class SSEManager {
  private clients: Map<string, SSEClient[]> = new Map();

  addClient(userId: string, res: Response): void {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, []);
    }
    const client: SSEClient = { userId, res, connectedAt: new Date() };
    this.clients.get(userId)!.push(client);
    logger.info(`SSE client connected: ${userId} (total: ${this.clients.get(userId)!.length})`);

    // Send initial heartbeat
    this.sendToClient(res, { type: 'CONNECTED', payload: { message: 'SSE stream established' } });
  }

  removeClient(userId: string, res: Response): void {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const filtered = userClients.filter((c) => c.res !== res);
    if (filtered.length === 0) {
      this.clients.delete(userId);
    } else {
      this.clients.set(userId, filtered);
    }
    logger.info(`SSE client disconnected: ${userId}`);
  }

  sendToUser(userId: string, event: SSEEvent): void {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.length === 0) return;

    for (const client of userClients) {
      this.sendToClient(client.res, event);
    }
  }

  broadcastToAll(event: SSEEvent): void {
    for (const [, clients] of this.clients) {
      for (const client of clients) {
        this.sendToClient(client.res, event);
      }
    }
  }

  private sendToClient(res: Response, event: SSEEvent): void {
    try {
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.payload)}\n\n`);
      // Flush if possible
      if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
        (res as unknown as { flush: () => void }).flush();
      }
    } catch (error) {
      logger.warn('Failed to send SSE event:', error);
    }
  }

  getConnectedCount(): number {
    let count = 0;
    for (const [, clients] of this.clients) {
      count += clients.length;
    }
    return count;
  }

  getActiveUserIds(): string[] {
    return Array.from(this.clients.keys());
  }
}

export const sseManager = new SSEManager();
