"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuizGateway = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const answers_1 = require("../lib/answers");
const SubmitAnswerDto_1 = require("../dto/SubmitAnswerDto");
class QuizGateway {
    io;
    constructor(io) {
        this.io = io;
        this.io.use((socket, next) => this.authenticate(socket, next));
        this.io.on('connection', (socket) => this.onConnection(socket));
    }
    authenticate(socket, next) {
        const token = socket.handshake.auth?.token;
        if (!token)
            return next(new Error('Non authentifié'));
        try {
            socket.data.user = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            next();
        }
        catch {
            next(new Error('Token invalide'));
        }
    }
    onConnection(socket) {
        socket.on('quiz:join', (roomId) => socket.join(`quiz:${roomId}`));
        socket.on('quiz:answer', (payload, ack) => this.handleAnswer(socket, payload, ack));
    }
    async handleAnswer(socket, payload = {}, ack) {
        const dto = (0, class_transformer_1.plainToInstance)(SubmitAnswerDto_1.SubmitAnswerDto, payload);
        const errors = await (0, class_validator_1.validate)(dto);
        if (errors.length > 0) {
            if (typeof ack === 'function') {
                ack({ error: 'Validation échouée', details: errors.flatMap(e => Object.values(e.constraints || {})) });
            }
            return;
        }
        const result = await (0, answers_1.submitAnswer)(dto);
        if (typeof ack !== 'function')
            return;
        if (!result)
            return ack({ error: 'Question non trouvée' });
        ack(result);
    }
}
exports.QuizGateway = QuizGateway;
