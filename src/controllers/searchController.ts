import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '../lib/prisma';

const productQuerySchema = z.object({
  name: z.string().optional(),
  minPrice: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional(),
  maxPrice: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .optional(),
  categoryId: z.string().regex(/^\d+$/).optional(),
  page: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  sortBy: z.enum(['name', 'price', 'stock', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

const categoryQuerySchema = z.object({
  name: z.string().optional(),
});

export async function search(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { type } = req.query as Record<string, string>;

    if (type === 'product') {
      const parsed = productQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Error de validación',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const {
        name,
        minPrice,
        maxPrice,
        categoryId,
        page = '1',
        limit = '10',
        sortBy = 'createdAt',
        order = 'asc',
      } = parsed.data;

      const pageNum = Math.max(1, parseInt(page, 10));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));

      const where: Prisma.ProductWhereInput = {};
      if (name) where.name = { contains: name, mode: 'insensitive' };
      if (minPrice || maxPrice) {
        where.price = {};
        if (minPrice) (where.price as Prisma.DecimalFilter).gte = parseFloat(minPrice);
        if (maxPrice) (where.price as Prisma.DecimalFilter).lte = parseFloat(maxPrice);
      }
      if (categoryId) where.categories = { some: { categoryId: parseInt(categoryId, 10) } };

      const [total, products] = await Promise.all([
        prisma.product.count({ where }),
        prisma.product.findMany({
          where,
          include: { categories: { include: { category: true } } },
          orderBy: { [sortBy]: order },
          skip: (pageNum - 1) * limitNum,
          take: limitNum,
        }),
      ]);

      res.json({
        data: products.map((p) => ({
          ...p,
          categories: p.categories.map((pc) => pc.category),
        })),
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          pages: Math.ceil(total / limitNum),
        },
      });
      return;
    }

    if (type === 'category') {
      const parsed = categoryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          error: 'Error de validación',
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }
      const where: Prisma.CategoryWhereInput = {};
      if (parsed.data.name) where.name = { contains: parsed.data.name, mode: 'insensitive' };
      const categories = await prisma.category.findMany({
        where,
        orderBy: { name: 'asc' },
      });
      res.json(categories);
      return;
    }

    res.status(400).json({ error: 'El parámetro type debe ser "product" o "category"' });
  } catch (err) {
    next(err);
  }
}
