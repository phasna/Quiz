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

describe('POST /api/users', () => {
  it('renvoie 400 si le champ username est manquant', async () => {
    const res = await request(app).post('/api/users').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username/i);
  });

  it('crée un utilisateur quand username est fourni', async () => {
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1, username: 'toto' });

    const res = await request(app).post('/api/users').send({ username: 'toto' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, username: 'toto' });
  });

  it("renvoie 409 si le nom d'utilisateur existe déjà", async () => {
    (prisma.user.create as jest.Mock).mockRejectedValue({ code: 'P2002' });

    const res = await request(app).post('/api/users').send({ username: 'toto' });

    expect(res.status).toBe(409);
  });
});

describe('GET /api/users/:id', () => {
  it("renvoie 404 si l'utilisateur n'existe pas", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app).get('/api/users/999');

    expect(res.status).toBe(404);
  });
});
