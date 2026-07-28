import express, { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { validateBody } from '../middlewares/validate';
import { RegisterDto, LoginDto } from '../dto/AuthDto';

const router = express.Router();

router.post('/register', validateBody(RegisterDto), async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { username, password: hashed } });
    res.status(201).json({ id: user.id, username: user.username });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      return res.status(409).json({ error: 'Ce nom d\'utilisateur existe déjà' });
    }
    throw err;
  }
});

router.post('/login', validateBody(LoginDto), async (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  const token = jwt.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET!, { expiresIn: '2h' });
  res.json({ token });
});

export default router;