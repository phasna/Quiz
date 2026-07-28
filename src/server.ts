import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import multer from 'multer';
import { Server } from 'socket.io';
import mediaRouter from './routes/media';
import usersRouter from './routes/users';
import prisma from './lib/prisma';
import { submitAnswer } from './lib/answers';
import authRouter from './routes/auth';
import { requireAuth } from './middlewares/auth';
import { validateBody } from './middlewares/validate';
import { SubmitAnswerDto } from './dto/SubmitAnswerDto';



const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const port = 3000;
const formParser = multer().none();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(process.cwd(), 'public')));

app.get('/hello', (req, res) => res.json({ message: 'Hello live-reload!' }));

app.use('/api/media', mediaRouter);
app.use('/api/users', usersRouter);

// Route pour récupérer toutes les questions (sans la bonne réponse, pour ne pas tricher)
app.get('/api/questions', async (req, res) => {
  const questions = await prisma.question.findMany({
    select: { id: true, question: true, options: true, imageUrl: true },
    orderBy: { id: 'asc' }
  });
  res.json(questions);
});

// Route pour associer une image (déjà uploadée via /api/media/upload) à une question
app.patch('/api/questions/:id/image', formParser, async (req, res) => {
  const questionId = Number(req.params.id);
  const { imageUrl } = req.body ?? {};

  if (!Number.isInteger(questionId)) {
    return res.status(400).json({ error: 'Identifiant de question invalide' });
  }

  if (req.body === undefined) {
    return res.status(400).json({ error: 'Body JSON ou form-data attendu' });
  }

  try {
    const question = await prisma.question.update({
      where: { id: questionId },
      data: { imageUrl: imageUrl || null }
    });
    res.json(question);
  } catch (err) {
    res.status(404).json({ error: 'Question non trouvée' });
  }
});

app.use('/api/auth', authRouter);

// Route pour soumettre une réponse
app.post('/api/submit', requireAuth, validateBody(SubmitAnswerDto), async (req, res) => {
  const { questionId, selectedAnswer, userId } = req.body;
  const result = await submitAnswer({ questionId, selectedAnswer, userId });

  if (!result) return res.status(404).json({ error: 'Question non trouvée' });

  res.json(result);
});

import { QuizGateway } from './ws/QuizGateway';

new QuizGateway(io);

httpServer.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});
