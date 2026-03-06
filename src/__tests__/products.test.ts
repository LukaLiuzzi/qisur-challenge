import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';
import { makeToken } from './helpers';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    productHistory: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    productCategory: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('../websocket/events', () => ({
  broadcast: jest.fn(),
}));

const mockProduct = {
  id: 1,
  name: 'Panel Solar 400W',
  description: 'Panel monocristalino',
  price: 250,
  stock: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
  categories: [],
};

const adminAuth = () => `Bearer ${makeToken('ADMIN')}`;
const clientAuth = () => `Bearer ${makeToken('CLIENT')}`;

describe('GET /api/products', () => {
  it('devuelve lista paginada de productos', async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(2);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([
      mockProduct,
      { ...mockProduct, id: 2, name: 'Inversor 3000W' },
    ]);

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data).toHaveLength(2);
  });

  it('aplica filtros de nombre y precio', async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(1);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

    const res = await request(app).get('/api/products').query({
      name: 'Panel',
      minPrice: '100',
      maxPrice: '500',
      page: '1',
      limit: '5',
    });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/products/:id', () => {
  it('devuelve el producto por id', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);

    const res = await request(app).get('/api/products/1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(1);
    expect(res.body.name).toBe('Panel Solar 400W');
  });

  it('devuelve 404 si el producto no existe', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/products/999');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Producto no encontrado');
  });
});

describe('POST /api/products', () => {
  it('crea un producto con token de admin', async () => {
    (prisma.product.create as jest.Mock).mockResolvedValue(mockProduct);

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuth())
      .send({ name: 'Panel Solar 400W', price: 250, stock: 50 });

    expect(res.status).toBe(201);
    expect(res.body.id).toBe(1);
  });

  it('devuelve 401 sin token de autenticación', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Panel Solar', price: 250, stock: 50 });

    expect(res.status).toBe(401);
  });

  it('devuelve 403 con rol CLIENT', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', clientAuth())
      .send({ name: 'Panel Solar', price: 250, stock: 50 });

    expect(res.status).toBe(403);
  });

  it('devuelve 400 con datos inválidos', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuth())
      .send({ name: '', price: -10, stock: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Error de validación');
  });

  it('devuelve 400 si faltan campos requeridos', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', adminAuth())
      .send({ name: 'Panel Solar' });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/products/:id', () => {
  it('actualiza el producto y registra historial si cambia el precio', async () => {
    const existing = { ...mockProduct, price: 200 };
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(existing);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) =>
      fn({
        productHistory: { create: jest.fn().mockResolvedValue({}) },
        productCategory: {
          deleteMany: jest.fn().mockResolvedValue({}),
          createMany: jest.fn().mockResolvedValue({}),
        },
        product: {
          update: jest.fn().mockResolvedValue({ ...mockProduct, price: 250, categories: [] }),
        },
      })
    );

    const res = await request(app)
      .put('/api/products/1')
      .set('Authorization', adminAuth())
      .send({ price: 250 });

    expect(res.status).toBe(200);
    expect(res.body.price).toBe(250);
  });

  it('actualiza sin historial si precio y stock no cambian', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) =>
      fn({
        productHistory: { create: jest.fn().mockResolvedValue({}) },
        productCategory: {
          deleteMany: jest.fn().mockResolvedValue({}),
          createMany: jest.fn().mockResolvedValue({}),
        },
        product: {
          update: jest.fn().mockResolvedValue({
            ...mockProduct,
            name: 'Nuevo nombre',
            categories: [],
          }),
        },
      })
    );

    const res = await request(app)
      .put('/api/products/1')
      .set('Authorization', adminAuth())
      .send({ name: 'Nuevo nombre' });

    expect(res.status).toBe(200);
  });

  it('devuelve 404 si el producto no existe', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .put('/api/products/999')
      .set('Authorization', adminAuth())
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).put('/api/products/1').send({ name: 'Test' });
    expect(res.status).toBe(401);
  });

  it('devuelve 403 con rol CLIENT', async () => {
    const res = await request(app)
      .put('/api/products/1')
      .set('Authorization', clientAuth())
      .send({ name: 'Test' });

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/products/:id', () => {
  it('elimina el producto', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    (prisma.product.delete as jest.Mock).mockResolvedValue(mockProduct);

    const res = await request(app).delete('/api/products/1').set('Authorization', adminAuth());

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Producto eliminado');
  });

  it('devuelve 404 si el producto no existe', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).delete('/api/products/999').set('Authorization', adminAuth());

    expect(res.status).toBe(404);
  });

  it('devuelve 401 sin token', async () => {
    const res = await request(app).delete('/api/products/1');
    expect(res.status).toBe(401);
  });

  it('devuelve 403 con rol CLIENT', async () => {
    const res = await request(app).delete('/api/products/1').set('Authorization', clientAuth());

    expect(res.status).toBe(403);
  });
});

describe('GET /api/products/:id/history', () => {
  it('devuelve el historial del producto', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    (prisma.productHistory.findMany as jest.Mock).mockResolvedValue([
      { id: 1, productId: 1, price: 200, stock: 40, changedAt: new Date() },
      { id: 2, productId: 1, price: 220, stock: 45, changedAt: new Date() },
    ]);

    const res = await request(app).get('/api/products/1/history');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  it('filtra por rango de fechas', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(mockProduct);
    (prisma.productHistory.findMany as jest.Mock).mockResolvedValue([]);

    const res = await request(app).get('/api/products/1/history').query({
      start: '2024-01-01T00:00:00.000Z',
      end: '2024-12-31T23:59:59.000Z',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('devuelve 404 si el producto no existe', async () => {
    (prisma.product.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/products/999/history');

    expect(res.status).toBe(404);
  });
});
