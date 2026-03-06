import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import logger from '../lib/logger';

export function httpLogger(req: AuthRequest, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.http('Solicitud HTTP', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start,
      userId: req.user?.id ?? null,
      ip: req.ip,
    });
  });
  next();
}
