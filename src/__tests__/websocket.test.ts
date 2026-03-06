import http from 'http';
import WebSocket from 'ws';
import app from '../app';
import { initWsServer } from '../websocket/server';
import { makeToken } from './helpers';

let server: http.Server;
let port: number;
let closeWss: () => void;

beforeAll((done) => {
  server = http.createServer(app);
  closeWss = initWsServer(server);
  server.listen(0, () => {
    const addr = server.address();
    port = typeof addr === 'object' && addr !== null ? addr.port : 0;
    done();
  });
});

afterAll((done) => {
  closeWss();
  server.close(done);
});

describe('WebSocket /ws', () => {
  it('acepta la conexión con un token válido', (done) => {
    const token = makeToken('CLIENT');
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });

    ws.on('error', done);
  });

  it('rechaza la conexión sin token con código 4001', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws`);

    ws.on('close', (code) => {
      expect(code).toBe(4001);
      done();
    });

    ws.on('error', () => {});
  });

  it('rechaza la conexión con token inválido con código 4001', (done) => {
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=esto.no.es.un.jwt`);

    ws.on('close', (code) => {
      expect(code).toBe(4001);
      done();
    });

    ws.on('error', () => {});
  });

  it('acepta conexión con token de admin', (done) => {
    const token = makeToken('ADMIN');
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

    ws.on('open', () => {
      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      done();
    });

    ws.on('error', done);
  });

  it('se desconecta limpiamente', (done) => {
    const token = makeToken('CLIENT');
    const ws = new WebSocket(`ws://localhost:${port}/ws?token=${token}`);

    ws.on('open', () => {
      ws.close();
    });

    ws.on('close', (code) => {
      expect([1000, 1005]).toContain(code);
      done();
    });

    ws.on('error', done);
  });
});
