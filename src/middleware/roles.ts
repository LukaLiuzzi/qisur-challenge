import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export function roles(allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'No tenés permisos para realizar esta acción' });
      return;
    }
    next();
  };
}
