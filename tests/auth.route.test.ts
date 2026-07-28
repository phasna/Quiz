jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../src/lib/prisma';
import authRouter from '../src/routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('POST /api/auth/register', () => {
  it('crée un utilisateur valide', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (prisma.user.create as jest.Mock).mockResolvedValue({ id: 1, username: 'alice' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: { username: 'alice', password: 'hashed-password' },
    });
    expect(res.body).toEqual({ id: 1, username: 'alice' });
  });

  it("renvoie 400 si le body est absent", async () => {
    const res = await request(app).post('/api/auth/register');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Corps de requete manquant');
  });

  it("renvoie 400 si le username est trop court", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'ab', password: 'secret123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation échouée');
  });

  it("renvoie 400 si le mot de passe est trop court", async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation échouée');
  });

  it("renvoie 409 si le username existe déjà", async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    (prisma.user.create as jest.Mock).mockRejectedValue({ code: 'P2002' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({ username: 'alice', password: 'secret123' });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("Ce nom d'utilisateur existe déjà");
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  it('retourne un token si les identifiants sont corrects', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'alice',
      password: 'hashed-password',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (jwt.sign as jest.Mock).mockReturnValue('jwt-token');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'alice' } });
    expect(bcrypt.compare).toHaveBeenCalledWith('secret123', 'hashed-password');
    expect(jwt.sign).toHaveBeenCalledWith(
      { userId: 1, username: 'alice' },
      'test-secret',
      { expiresIn: '2h' }
    );
    expect(res.body).toEqual({ token: 'jwt-token' });
  });

  it("renvoie 401 si l'utilisateur n'existe pas", async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost', password: 'secret123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Identifiants invalides');
  });

  it('renvoie 401 si le mot de passe est incorrect', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'alice',
      password: 'hashed-password',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'wrongpass' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Identifiants invalides');
  });

  it("renvoie 400 si le body de login est invalide", async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: '', password: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation échouée');
  });

  it("renvoie 500 si JWT_SECRET n'est pas configuré", async () => {
    delete process.env.JWT_SECRET;
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      username: 'alice',
      password: 'hashed-password',
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'alice', password: 'secret123' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Configuration serveur invalide');
    expect(jwt.sign).not.toHaveBeenCalled();
  });
});
