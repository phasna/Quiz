const prisma = require('./prisma');

// Vérifie une réponse et l'enregistre en base. Utilisé à la fois par la route
// REST (/api/submit) et par le canal temps réel Socket.IO.
async function submitAnswer({ questionId, selectedAnswer, userId }) {
  const question = await prisma.question.findUnique({ where: { id: Number(questionId) } });
  if (!question) return null;

  const isCorrect = question.answer === selectedAnswer;

  await prisma.answer.create({
    data: {
      questionId: question.id,
      selectedAnswer,
      isCorrect,
      userId: userId ? Number(userId) : null
    }
  });

  return { correct: isCorrect, correctAnswer: question.answer };
}

module.exports = { submitAnswer };
