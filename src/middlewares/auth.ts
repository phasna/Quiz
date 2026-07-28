import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../lib/jwt';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Non authentifié' });
  let secret: string;
  try {
    secret = getJwtSecret();
  } catch {
    return res.status(500).json({ error: 'Configuration serveur invalide' });
  }
  try {
    (req as any).user = jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: 'Token invalide' });
  }
}