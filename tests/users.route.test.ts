// Tests d'intégration légers de la route POST /api/users.
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

import express from 'express';
import request from 'supertest';
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
