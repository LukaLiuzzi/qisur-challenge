import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { broadcast } from '../websocket/events';
import prisma from '../lib/prisma';

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  categoryIds: z.array(z.number().int().positive()).optional(),
});

const updateSchema = createSchema.partial();

const historyQuerySchema = z.object({
  start: z.iso.datetime().optional(),
  end: z.iso.datetime().optional(),
});

type ProductWithCategories = Prisma.ProductGetPayload<{
  include: { categories: { include: { category: true } } };
}>;

function formatProduct(p: ProductWithCategories) {
  return { ...p, categories: p.categories.map((pc) => pc.category) };
}

const productInclude = {
  categories: { include: { category: true } },
} as const;

const ALLOWED_SORT = ['name', 'price', 'stock', 'createdAt'] as const;
const ALLOWED_ORDER = ['asc', 'desc'] as const;

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name,
      minPrice,
      maxPrice,
      categoryId,
      page = '1',
      limit = '10',
      sortBy = 'createdAt',
      order = 'asc',
    } = req.query as Record<string, string>;

    const validSortBy = (ALLOWED_SORT as readonly string[]).includes(sortBy) ? sortBy : 'createdAt';
    const validOrder = (ALLOWED_ORDER as readonly string[]).includes(order) ? order : 'asc';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

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
        include: productInclude,
        orderBy: { [validSortBy]: validOrder },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
    ]);

    res.json({
      data: products.map(formatProduct),
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params['id']), 10);
    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json(formatProduct(product));
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
    const { name, description, price, stock, categoryIds = [] } = parsed.data;

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        stock,
        categories: { create: categoryIds.map((id) => ({ categoryId: id })) },
      },
      include: productInclude,
    });

    const result = formatProduct(product);
    broadcast('product:created', result);
    res.status(201).json(result);
  } catch (err) {
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

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const { name, description, price, stock, categoryIds } = parsed.data;

    const priceChanged =
      price !== undefined && parseFloat(String(price)) !== parseFloat(String(existing.price));
    const stockChanged = stock !== undefined && stock !== existing.stock;

    const product = await prisma.$transaction(async (tx) => {
      if (priceChanged || stockChanged) {
        await tx.productHistory.create({
          data: { productId: id, price: existing.price, stock: existing.stock },
        });
      }

      const updateData: Prisma.ProductUpdateInput = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (price !== undefined) updateData.price = price;
      if (stock !== undefined) updateData.stock = stock;

      if (categoryIds !== undefined) {
        await tx.productCategory.deleteMany({ where: { productId: id } });
        await tx.productCategory.createMany({
          data: categoryIds.map((cid) => ({ productId: id, categoryId: cid })),
        });
      }

      return tx.product.update({
        where: { id },
        data: updateData,
        include: productInclude,
      });
    });

    const result = formatProduct(product);
    broadcast('product:updated', result);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params['id']), 10);
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    await prisma.product.delete({ where: { id } });
    broadcast('product:deleted', { id });
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = parseInt(String(req.params['id']), 10);
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Error de validación',
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const where: Prisma.ProductHistoryWhereInput = { productId: id };
    if (parsed.data.start || parsed.data.end) {
      where.changedAt = {};
      if (parsed.data.start)
        (where.changedAt as Prisma.DateTimeFilter).gte = new Date(parsed.data.start);
      if (parsed.data.end)
        (where.changedAt as Prisma.DateTimeFilter).lte = new Date(parsed.data.end);
    }

    const history = await prisma.productHistory.findMany({
      where,
      orderBy: { changedAt: 'desc' },
    });
    res.json(history);
  } catch (err) {
    next(err);
  }
}
