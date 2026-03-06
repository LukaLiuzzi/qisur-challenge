import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { makeToken } from './helpers';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('../websocket/events', () => ({
  broadcast: jest.fn(),
}));

const mockCategory = {
  id: 1,
  name: 'Iluminación',
  description: 'Productos de iluminación',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const adminAuth = () => `Bearer ${makeToken('ADMIN')}`;
const clientAuth = () => `Bearer ${makeToken('CLIENT')}`;

describe('GET /api/categories', () => {
  it('devuelve todas las categorías', async () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([
      mockCategory,
      { ...mockCategory, id: 2, name: 'Energía Solar' },
    ]);

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('devuelve array vacío si no hay categorías', async () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });
});

describe('POST /api/categories', () => {
  it('crea una categoría con token de admin', async () => {
    (prisma.category.create as jest.Mock).mockResolvedValue(mockCategory);

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', adminAuth())
      .send({ name: 'Iluminación', description: 'Productos de iluminación' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Iluminación');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).post('/api/categories').send({ name: 'Iluminación' });

    expect(res.status).toBe(401);
  });

  it('devuelve 403 con rol CLIENT', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', clientAuth())
      .send({ name: 'Iluminación' });

    expect(res.status).toBe(403);
  });

  it('devuelve 400 si el nombre está vacío', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', adminAuth())
      .send({ name: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Error de validación');
  });

  it('devuelve 409 si el nombre ya existe', async () => {
    const error = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
    });
    (prisma.category.create as jest.Mock).mockRejectedValue(error);

    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', adminAuth())
      .send({ name: 'Iluminación' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Ya existe una categoría con ese nombre');
  });
});

describe('PUT /api/categories/:id', () => {
  it('actualiza la categoría', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    (prisma.category.update as jest.Mock).mockResolvedValue({
      ...mockCategory,
      name: 'Iluminación LED',
    });

    const res = await request(app)
      .put('/api/categories/1')
      .set('Authorization', adminAuth())
      .send({ name: 'Iluminación LED' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Iluminación LED');
  });

  it('devuelve 404 si la categoría no existe', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/categories/999')
      .set('Authorization', adminAuth())
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Categoría no encontrada');
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).put('/api/categories/1').send({ name: 'Test' });

    expect(res.status).toBe(401);
  });

  it('devuelve 403 con rol CLIENT', async () => {
    const res = await request(app)
      .put('/api/categories/1')
      .set('Authorization', clientAuth())
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
  });

  it('devuelve 409 si el nuevo nombre ya existe', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    const error = Object.assign(new Error('Unique constraint'), {
      code: 'P2002',
    });
    (prisma.category.update as jest.Mock).mockRejectedValue(error);

    const res = await request(app)
      .put('/api/categories/1')
      .set('Authorization', adminAuth())
      .send({ name: 'Energía Solar' });

    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/categories/:id', () => {
  it('elimina la categoría', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
    (prisma.category.delete as jest.Mock).mockResolvedValue(mockCategory);

    const res = await request(app).delete('/api/categories/1').set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Categoría eliminada');
  });

  it('devuelve 404 si la categoría no existe', async () => {
    (prisma.category.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).delete('/api/categories/999').set('Authorization', adminAuth());

    expect(res.status).toBe(404);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).delete('/api/categories/1');
    expect(res.status).toBe(401);
  });

  it('devuelve 403 con rol CLIENT', async () => {
    const res = await request(app).delete('/api/categories/1').set('Authorization', clientAuth());

    expect(res.status).toBe(403);
  });
});
