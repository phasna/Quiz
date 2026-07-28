// Tests d'intégration de la route POST /api/users.
// prisma est mocké : pas besoin de base de données réelle pour ces tests.
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    media: { findUnique: jest.fn() },
  },
}));

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import usersRouter from '../src/routes/users';
import prisma from '../src/lib/prisma';

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('GET /api/users', () => {
  it('renvoie la liste des utilisateurs', async () => {
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      { id: 1, username: 'toto', avatarId: null, avatar: null, createdAt: new Date('2026-01-01') },
    ]);

    const res = await request(app).get('/api/users');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].username).toBe('toto');
  });
});

describe('GET /api/users/:id', () => {
  it("renvoie 404 si l'utilisateur n'existe pas", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/users/999');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/users/:id/avatar', () => {
  const authHeader = { Authorization: 'Bearer valid-token' };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 1 });
  });

  it('renvoie 401 sans token', async () => {
    const res = await request(app).patch('/api/users/1/avatar').send({ mediaId: 2 });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Non authentifié');
  });

  it('renvoie 404 si le média demandé n’existe pas', async () => {
    (prisma.media.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/users/1/avatar')
      .set(authHeader)
      .send({ mediaId: 99 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Média non trouvé');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('met à jour l’avatar quand le média existe', async () => {
    (prisma.media.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'toto',
      avatarId: 2,
      avatar: { id: 2 },
      createdAt: new Date('2026-01-01'),
    });

    const res = await request(app)
      .patch('/api/users/1/avatar')
      .set(authHeader)
      .send({ mediaId: 2 });

    expect(res.status).toBe(200);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { avatarId: 2 },
      select: { id: true, username: true, avatarId: true, avatar: true, createdAt: true },
    });
    expect(res.body.avatarId).toBe(2);
  });

  it("permet de retirer l'avatar avec mediaId null", async () => {
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'toto',
      avatarId: null,
      avatar: null,
      createdAt: new Date('2026-01-01'),
    });

    const res = await request(app)
      .patch('/api/users/1/avatar')
      .set(authHeader)
      .send({ mediaId: null });

    expect(res.status).toBe(200);
    expect(prisma.media.findUnique).not.toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { avatarId: null },
      select: { id: true, username: true, avatarId: true, avatar: true, createdAt: true },
    });
  });

  it("renvoie 404 si l'utilisateur n'existe pas au moment du PATCH", async () => {
    (prisma.media.findUnique as jest.Mock).mockResolvedValue({ id: 2 });
    (prisma.user.update as jest.Mock).mockRejectedValue({ code: 'P2025' });

    const res = await request(app)
      .patch('/api/users/999/avatar')
      .set(authHeader)
      .send({ mediaId: 2 });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Utilisateur non trouvé');
  });
});
