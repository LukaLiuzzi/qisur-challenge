import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { broadcast } from '../websocket/events';
import prisma from '../lib/prisma';

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

const updateSchema = createSchema.partial();

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Error de validación',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const category = await prisma.category.create({ data: parsed.data });
    broadcast('category:created', category);
    res.status(201).json(category);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      return;
    }
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params['id']), 10);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Error de validación',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    broadcast('category:updated', category);
    res.json(category);
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      return;
    }
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params['id']), 10);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }
    await prisma.category.delete({ where: { id } });
    broadcast('category:deleted', { id });
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    next(err);
  }
}
