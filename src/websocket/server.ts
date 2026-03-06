import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Server } from 'http';
import { URL } from 'url';
import { verifyToken } from '../config/jwt';
import { addClient, removeClient } from './events';

export function initWsServer(httpServer: Server): () => void {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const reqUrl = new URL(req.url!, `http://${req.headers.host}`);
    const token = reqUrl.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'No autorizado');
      return;
    }

    try {
      verifyToken(token);
    } catch {
      ws.close(4001, 'Token inválido');
      return;
    }

    addClient(ws);
    ws.on('close', () => removeClient(ws));
    ws.on('error', () => removeClient(ws));
  });

  return () => wss.close();
}
