const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Questions (tu peux en ajouter facilement)
let questions = [
  {
    id: 1,
    question: "Quelle est la capitale de la France ?",
    options: ["Lyon", "Paris", "Marseille", "Toulouse"],
    answer: "Paris"
  },
  {
    id: 2,
    question: "Combien font 8 + 5 ?",
    options: ["10", "12", "13", "15"],
    answer: "13"
  },
  {
    id: 3,
    question: "Qui a peint la Joconde ?",
    options: ["Picasso", "Van Gogh", "Léonard de Vinci", "Monet"],
    answer: "Léonard de Vinci"
  }
];

// Route pour récupérer toutes les questions (sans la bonne réponse, pour ne pas tricher)
app.get('/api/questions', (req, res) => {
  const questionsSansReponse = questions.map(({ id, question, options }) => ({ id, question, options }));
  res.json(questionsSansReponse);
});

// Route pour soumettre une réponse
app.post('/api/submit', (req, res) => {
  const { questionId, selectedAnswer } = req.body;
  const question = questions.find(q => q.id === questionId);

  if (!question) return res.status(404).json({ error: "Question non trouvée" });

  const isCorrect = question.answer === selectedAnswer;
  res.json({ correct: isCorrect, correctAnswer: question.answer });
});

app.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});
