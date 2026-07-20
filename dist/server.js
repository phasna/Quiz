"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const media_1 = __importDefault(require("./routes/media"));
const users_1 = __importDefault(require("./routes/users"));
const prisma_1 = __importDefault(require("./lib/prisma"));
const answers_1 = require("./lib/answers");
const app = (0, express_1.default)();
const httpServer = http_1.default.createServer(app);
const io = new socket_io_1.Server(httpServer, { cors: { origin: '*' } });
const port = 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(process.cwd(), 'public')));
app.use('/api/media', media_1.default);
app.use('/api/users', users_1.default);
// Route pour récupérer toutes les questions (sans la bonne réponse, pour ne pas tricher)
app.get('/api/questions', async (req, res) => {
    const questions = await prisma_1.default.question.findMany({
        select: { id: true, question: true, options: true, imageUrl: true },
        orderBy: { id: 'asc' }
    });
    res.json(questions);
});
// Route pour associer une image (déjà uploadée via /api/media/upload) à une question
app.patch('/api/questions/:id/image', async (req, res) => {
    const { imageUrl } = req.body;
    try {
        const question = await prisma_1.default.question.update({
            where: { id: Number(req.params.id) },
            data: { imageUrl: imageUrl || null }
        });
        res.json(question);
    }
    catch (err) {
        res.status(404).json({ error: 'Question non trouvée' });
    }
});
// Route pour soumettre une réponse
app.post('/api/submit', async (req, res) => {
    const { questionId, selectedAnswer, userId } = req.body;
    const result = await (0, answers_1.submitAnswer)({ questionId, selectedAnswer, userId });
    if (!result)
        return res.status(404).json({ error: 'Question non trouvée' });
    res.json(result);
});
// Communication instantanée : soumission des réponses en direct via Socket.IO
io.on('connection', (socket) => {
    socket.on('quiz:answer', async ({ questionId, selectedAnswer, userId } = {}, ack) => {
        const result = await (0, answers_1.submitAnswer)({ questionId, selectedAnswer, userId });
        if (typeof ack !== 'function')
            return;
        if (!result)
            return ack({ error: 'Question non trouvée' });
        ack(result);
    });
});
httpServer.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});
