import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { submitAnswer } from '../lib/answers';
import { getJwtSecret } from '../lib/jwt';
import { SubmitAnswerDto } from '../dto/SubmitAnswerDto';

export class QuizGateway {
  constructor(private io: Server) {
    this.io.use((socket, next) => this.attachUserIfPresent(socket, next));
    this.io.on('connection', (socket) => this.onConnection(socket));
  }

  private attachUserIfPresent(socket: Socket, next: (err?: Error) => void) {
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    let secret: string;
    try {
      secret = getJwtSecret();
    } catch {
      return next();
    }
    try {
      (socket.data as any).user = jwt.verify(token, secret);
      next();
    } catch {
      next();
    }
  }

  private onConnection(socket: Socket) {
    socket.on('quiz:join', (roomId: string) => socket.join(`quiz:${roomId}`));
    socket.on('quiz:answer', (payload, ack) => this.handleAnswer(socket, payload, ack));
  }

  private async handleAnswer(socket: Socket, payload: any = {}, ack: any) {
    const dto = plainToInstance(SubmitAnswerDto, payload);
    const authenticatedUserId = Number((socket.data as any).user?.userId);
    if (dto.userId === undefined && Number.isInteger(authenticatedUserId)) {
      dto.userId = authenticatedUserId;
    }
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