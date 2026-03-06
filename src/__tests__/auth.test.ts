import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../app';
import prisma from '../lib/prisma';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

const mockUser = {
  id: 1,
  email: 'test@example.com',
  password: 'hashed',
  role: 'CLIENT',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('POST /api/auth/register', () => {
  it('crea un usuario y devuelve token', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
    (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@example.com');
    expect(res.body.user).not.toHaveProperty('password');
  });

  it('devuelve 400 si el email es inválido', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'no-es-un-email',
      password: 'password123',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Error de validación');
  });

  it('devuelve 400 si la contraseña tiene menos de 6 caracteres', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: '123',
    });

    expect(res.status).toBe(400);
  });

  it('devuelve 409 si el email ya existe', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('El email ya está registrado');
  });

  it('devuelve 400 si el body está vacío', async () => {
    const res = await request(app).post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('devuelve token con credenciales válidas', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('devuelve 401 si el usuario no existe', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post('/api/auth/login').send({
      email: 'noexiste@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Credenciales inválidas');
  });

  it('devuelve 401 si la contraseña es incorrecta', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.status).toBe(401);
  });

  it('devuelve 400 si faltan campos', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});
