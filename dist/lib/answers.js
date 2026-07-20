"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitAnswer = submitAnswer;
const prisma_1 = __importDefault(require("./prisma"));
// Vérifie une réponse et l'enregistre en base. Utilisé à la fois par la route
// REST (/api/submit) et par le canal temps réel Socket.IO.
async function submitAnswer({ questionId, selectedAnswer, userId }) {
    const question = await prisma_1.default.question.findUnique({ where: { id: Number(questionId) } });
    if (!question)
        return null;
    const isCorrect = question.answer === selectedAnswer;
    await prisma_1.default.answer.create({
        data: {
            questionId: question.id,
            selectedAnswer,
            isCorrect,
            userId: userId ? Number(userId) : null
        }
    });
    return { correct: isCorrect, correctAnswer: question.answer };
}
