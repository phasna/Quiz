import express from 'express';
import cors from 'cors';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';
import mediaRouter from './routes/media';
import usersRouter from './routes/users';
import prisma from './lib/prisma';
import { submitAnswer } from './lib/answers';

const app = express();
const httpServer = http.createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const port = 3000;

app.use(cors());
app.use(express.json());
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
app.patch('/api/questions/:id/image', async (req, res) => {
  const { imageUrl } = req.body;

  try {
    const question = await prisma.question.update({
      where: { id: Number(req.params.id) },
      data: { imageUrl: imageUrl || null }
    });
    res.json(question);
  } catch (err) {
    res.status(404).json({ error: 'Question non trouvée' });
  }
});

// Route pour soumettre une réponse
app.post('/api/submit', async (req, res) => {
  const { questionId, selectedAnswer, userId } = req.body;
  const result = await submitAnswer({ questionId, selectedAnswer, userId });

  if (!result) return res.status(404).json({ error: 'Question non trouvée' });

  res.json(result);
});

// Communication instantanée : soumission des réponses en direct via Socket.IO
io.on('connection', (socket) => {
  socket.on('quiz:answer', async ({ questionId, selectedAnswer, userId } = {}, ack) => {
    const result = await submitAnswer({ questionId, selectedAnswer, userId });

    if (typeof ack !== 'function') return;
    if (!result) return ack({ error: 'Question non trouvée' });
    ack(result);
  });
});

httpServer.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});
