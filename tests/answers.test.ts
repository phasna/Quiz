// Tests unitaires de la logique de correction (src/lib/answers.ts).
// prisma est mocké : ces tests ne nécessitent aucune base de données réelle,
// ce qui les rend exécutables tels quels dans la CI.
jest.mock('../src/lib/prisma', () => ({
  __esModule: true,
  default: {
    question: { findUnique: jest.fn() },
    answer: { create: jest.fn() },
  },
}));

import prisma from '../src/lib/prisma';
import { submitAnswer } from '../src/lib/answers';

const mockedFindUnique = prisma.question.findUnique as jest.Mock;
const mockedCreate = prisma.answer.create as jest.Mock;

describe('submitAnswer', () => {
  it('renvoie correct=true et enregistre la réponse quand elle est bonne', async () => {
    mockedFindUnique.mockResolvedValue({ id: 1, answer: 'Paris' });
    mockedCreate.mockResolvedValue({});

    const result = await submitAnswer({ questionId: 1, selectedAnswer: 'Paris', userId: null });

    expect(result).toEqual({ correct: true, correctAnswer: 'Paris' });
    expect(mockedCreate).toHaveBeenCalledWith({
      data: { questionId: 1, selectedAnswer: 'Paris', isCorrect: true, userId: null },
    });
  });

  it('renvoie correct=false quand la réponse est mauvaise', async () => {
    mockedFindUnique.mockResolvedValue({ id: 1, answer: 'Paris' });
    mockedCreate.mockResolvedValue({});

    const result = await submitAnswer({ questionId: 1, selectedAnswer: 'Lyon' });

    expect(result?.correct).toBe(false);
    expect(result?.correctAnswer).toBe('Paris');
  });

  it("renvoie null si la question n'existe pas", async () => {
    mockedFindUnique.mockResolvedValue(null);

    const result = await submitAnswer({ questionId: 999, selectedAnswer: 'peu importe' });

    expect(result).toBeNull();
    expect(mockedCreate).not.toHaveBeenCalled();
  });
});
