import express, { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { requireAuth } from '../middlewares/auth';

const router = express.Router();

// GET /api/users — liste des utilisateurs (avec leur avatar)
// La création d'utilisateur se fait désormais via POST /api/auth/register
router.get('/', async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true, avatarId: true, avatar: true, createdAt: true },
    orderBy: { id: 'asc' }
  });
  res.json(users);
});

// GET /api/users/:id — un utilisateur précis (avec son avatar)
router.get('/:id', async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(req.params.id) },
    select: { id: true, username: true, avatarId: true, avatar: true, createdAt: true }
  });
  if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
  res.json(user);
});

// PATCH /api/users/:id/avatar — lie un Media (déjà uploadé via /api/media/upload) comme avatar
router.patch('/:id/avatar', requireAuth, async (req: Request, res: Response) => {
  const { mediaId } = req.body;

  if (mediaId !== null && mediaId !== undefined) {
    const media = await prisma.media.findUnique({ where: { id: Number(mediaId) } });
    if (!media) return res.status(404).json({ error: 'Média non trouvé' });
  }

  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { avatarId: mediaId === null || mediaId === undefined ? null : Number(mediaId) },
      select: { id: true, username: true, avatarId: true, avatar: true, createdAt: true }
    });
    res.json(user);
  } catch (err) {
    if ((err as { code?: string }).code === 'P2025') {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    throw err;
  }
});

export default router;
