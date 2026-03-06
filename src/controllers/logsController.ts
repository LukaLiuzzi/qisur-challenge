import { Response, NextFunction } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const VALID_LEVELS = ['error', 'warn', 'info', 'http', 'debug'] as const;

const querySchema = z.object({
  level: z.enum(VALID_LEVELS).optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function getLogs(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Error de validación',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const { level, start, end, page, limit } = parsed.data;

    const where: Record<string, unknown> = {};
    if (level) where.level = level;
    if (start || end) {
      const createdAt: Record<string, Date> = {};
      if (start) createdAt.gte = new Date(start);
      if (end) createdAt.lte = new Date(end);
      where.createdAt = createdAt;
    }

    const [total, logs] = await Promise.all([
      prisma.log.count({ where }),
      prisma.log.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    res.json({ total, page, limit, data: logs });
  } catch (err) {
    next(err);
  }
}

export async function getLog(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params['id']), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID inválido' });
      return;
    }

    const log = await prisma.log.findUnique({ where: { id } });
    if (!log) {
      res.status(404).json({ error: 'Log no encontrado' });
      return;
    }

    res.json(log);
  } catch (err) {
    next(err);
  }
}
