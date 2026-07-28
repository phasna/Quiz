jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../src/middlewares/auth';
import { validateBody } from '../src/middlewares/validate';
import { RegisterDto } from '../src/dto/AuthDto';

describe('requireAuth', () => {
  const app = express();
  app.use(express.json());
  app.get('/protected', requireAuth, (_req, res) => {
    res.json({ ok: true });
  });

  it('laisse passer une requête avec un bearer token valide', async () => {
    (jwt.verify as jest.Mock).mockReturnValue({ userId: 1 });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(jwt.verify).toHaveBeenCalledWith('valid-token', process.env.JWT_SECRET);
  });

  it('renvoie 401 si le header authorization est absent', async () => {
    const res = await request(app).get('/protected');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Non authentifié');
  });

  it('renvoie 401 si le token est invalide', async () => {
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('bad token');
    });

    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token invalide');
  });
});

describe('validateBody', () => {
  const app = express();
  app.use(express.json());
  app.post('/validate', validateBody(RegisterDto), (req, res) => {
    res.json(req.body);
  });

  it('renvoie 400 si le body est absent', async () => {
    const res = await request(app).post('/validate');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Corps de requete manquant');
  });

  it('renvoie 400 si le body est un tableau JSON', async () => {
    const res = await request(app)
      .post('/validate')
      .send([{ username: 'alice', password: 'secret123' }]);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Format de body invalide');
  });

  it('renvoie 400 si le body ne respecte pas le DTO', async () => {
    const res = await request(app)
      .post('/validate')
      .send({ username: '', password: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation échouée');
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('laisse passer un body valide', async () => {
    const res = await request(app)
      .post('/validate')
      .send({ username: 'alice', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.username).toBe('alice');
    expect(res.body.password).toBe('secret123');
  });
});
