const express = require('express');
const cors = require('cors');
const path = require('path');
const mediaRouter = require('./routes/media');
const usersRouter = require('./routes/users');
const prisma = require('./lib/prisma');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
  const { questionId, selectedAnswer } = req.body;
  const question = await prisma.question.findUnique({ where: { id: questionId } });

  if (!question) return res.status(404).json({ error: "Question non trouvée" });

  const isCorrect = question.answer === selectedAnswer;
  res.json({ correct: isCorrect, correctAnswer: question.answer });
});

app.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});
