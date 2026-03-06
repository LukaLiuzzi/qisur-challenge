import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'js-yaml';
import fs from 'fs';
import path from 'path';

import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import categoryRoutes from './routes/categories';
import searchRoutes from './routes/search';
import logRoutes from './routes/logs';
import { httpLogger } from './middleware/httpLogger';
import logger from './lib/logger';

const app = express();

app.use(cors());
app.use(express.json());
app.use(httpLogger);

try {
  const swaggerDoc = YAML.load(
    fs.readFileSync(path.join(__dirname, '../docs/swagger.yaml'), 'utf8')
  ) as object;
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc));
} catch {
  console.warn('swagger.yaml no encontrado');
}

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/logs', logRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error(err.message || 'Error interno del servidor', {
    method: req.method,
    path: req.path,
    stack: err.stack,
  });
  const status: number = err.status || 500;
  res.status(status).json({ error: err.message || 'Error interno del servidor' });
});

export default app;
