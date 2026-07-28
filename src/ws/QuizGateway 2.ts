import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { submitAnswer } from '../lib/answers';
import { SubmitAnswerDto } from '../dto/SubmitAnswerDto';

export class QuizGateway {
  constructor(private io: Server) {
    this.io.use((socket, next) => this.authenticate(socket, next));
    this.io.on('connection', (socket) => this.onConnection(socket));
  }

  private authenticate(socket: Socket, next: (err?: Error) => void) {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Non authentifié'));
    try {
      (socket.data as any).user = jwt.verify(token, process.env.JWT_SECRET!);
      next();
    } catch {
      next(new Error('Token invalide'));
    }
  }

  private onConnection(socket: Socket) {
    socket.on('quiz:join', (roomId: string) => socket.join(`quiz:${roomId}`));
    socket.on('quiz:answer', (payload, ack) => this.handleAnswer(socket, payload, ack));
  }

  private async handleAnswer(socket: Socket, payload: any = {}, ack: any) {
    const dto = plainToInstance(SubmitAnswerDto, payload);
    const errors = await validate(dto);
    if (errors.length > 0) {
      if (typeof ack === 'function') {
        ack({ error: 'Validation échouée', details: errors.flatMap(e => Object.values(e.constraints || {})) });
      }
      return;
    }

    const result = await submitAnswer(dto);
    if (typeof ack !== 'function') return;
    if (!result) return ack({ error: 'Question non trouvée' });
    ack(result);
  }
}