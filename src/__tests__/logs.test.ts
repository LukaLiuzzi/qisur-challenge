import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { makeToken } from './helpers';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    log: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

const adminAuth = () => `Bearer ${makeToken('ADMIN')}`;
const clientAuth = () => `Bearer ${makeToken('CLIENT')}`;

const mockLog = {
  id: 1,
  level: 'http',
  message: 'Solicitud HTTP',
  meta: { method: 'GET', path: '/api/products', statusCode: 200, duration: 12 },
  createdAt: new Date('2026-01-01T00:00:00Z'),
};

describe('GET /api/logs', () => {
  it('devuelve la lista paginada para admins', async () => {
    (prisma.log.count as jest.Mock).mockResolvedValue(1);
    (prisma.log.findMany as jest.Mock).mockResolvedValue([mockLog]);

    const res = await request(app).get('/api/logs').set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].level).toBe('http');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/logs');
    expect(res.status).toBe(401);
  });

  it('devuelve 403 con rol CLIENT', async () => {
    const res = await request(app).get('/api/logs').set('Authorization', clientAuth());
    expect(res.status).toBe(403);
  });

  it('filtra por level', async () => {
    (prisma.log.count as jest.Mock).mockResolvedValue(0);
    (prisma.log.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/logs?level=error').set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(prisma.log.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ level: 'error' }),
      })
    );
  });

  it('filtra por rango de fechas', async () => {
    (prisma.log.count as jest.Mock).mockResolvedValue(0);
    (prisma.log.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app)
      .get('/api/logs?start=2026-01-01T00:00:00Z&end=2026-01-31T23:59:59Z')
      .set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(prisma.log.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ createdAt: expect.any(Object) }),
      })
    );
  });

  it('respeta paginación', async () => {
    (prisma.log.count as jest.Mock).mockResolvedValue(50);
    (prisma.log.findMany as jest.Mock).mockResolvedValue([mockLog]);

    const res = await request(app)
      .get('/api/logs?page=2&limit=10')
      .set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(res.body.page).toBe(2);
    expect(res.body.limit).toBe(10);
    expect(prisma.log.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });

  it('devuelve 400 con level inválido', async () => {
    const res = await request(app).get('/api/logs?level=invalid').set('Authorization', adminAuth());
    expect(res.status).toBe(400);
  });
});

describe('GET /api/logs/:id', () => {
  it('devuelve el log por id', async () => {
    (prisma.log.findUnique as jest.Mock).mockResolvedValue(mockLog);

    const res = await request(app).get('/api/logs/1').set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.level).toBe('http');
  });

  it('devuelve 404 si el log no existe', async () => {
    (prisma.log.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/logs/999').set('Authorization', adminAuth());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Log no encontrado');
  });

  it('devuelve 400 con id no numérico', async () => {
    const res = await request(app).get('/api/logs/abc').set('Authorization', adminAuth());
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('ID inválido');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).get('/api/logs/1');
    expect(res.status).toBe(401);
  });

  it('devuelve 403 con rol CLIENT', async () => {
    const res = await request(app).get('/api/logs/1').set('Authorization', clientAuth());
    expect(res.status).toBe(403);
  });
});
