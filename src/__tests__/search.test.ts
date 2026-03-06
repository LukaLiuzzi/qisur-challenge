import request from 'supertest';
import app from '../app';
import prisma from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    product: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  },
}));

const mockProduct = {
  id: 1,
  name: 'Panel Solar 400W',
  description: 'Descripción',
  price: 250,
  stock: 50,
  createdAt: new Date(),
  updatedAt: new Date(),
  categories: [],
};

const mockCategory = {
  id: 1,
  name: 'Energía Solar',
  description: 'Categoría solar',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('GET /api/search', () => {
  it('busca productos con type=product', async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(1);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

    const res = await request(app).get('/api/search').query({ type: 'product' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('meta');
    expect(res.body.data).toHaveLength(1);
  });

  it('busca productos con filtro de nombre', async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(1);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

    const res = await request(app).get('/api/search').query({ type: 'product', name: 'Panel' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('busca productos con filtro de precio', async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(1);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

    const res = await request(app)
      .get('/api/search')
      .query({ type: 'product', minPrice: '100', maxPrice: '300' });

    expect(res.status).toBe(200);
  });

  it('busca productos con paginación', async () => {
    (prisma.product.count as jest.Mock).mockResolvedValue(30);
    (prisma.product.findMany as jest.Mock).mockResolvedValue([mockProduct]);

    const res = await request(app)
      .get('/api/search')
      .query({ type: 'product', page: '2', limit: '5' });

    expect(res.status).toBe(200);
    expect(res.body.meta.page).toBe(2);
    expect(res.body.meta.limit).toBe(5);
  });

  it('busca categorías con type=category', async () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([mockCategory]);

    const res = await request(app).get('/api/search').query({ type: 'category' });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
  });

  it('busca categorías con filtro de nombre', async () => {
    (prisma.category.findMany as jest.Mock).mockResolvedValue([mockCategory]);

    const res = await request(app).get('/api/search').query({ type: 'category', name: 'solar' });

    expect(res.status).toBe(200);
  });

  it('devuelve 400 si no se envía type', async () => {
    const res = await request(app).get('/api/search');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/);
  });

  it('devuelve 400 con type inválido', async () => {
    const res = await request(app).get('/api/search').query({ type: 'invalido' });

    expect(res.status).toBe(400);
  });
});
