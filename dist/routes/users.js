"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const router = express_1.default.Router();
// POST /api/users — crée un utilisateur
router.post('/', async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ error: 'Le champ "username" est requis' });
    }
    try {
        const user = await prisma_1.default.user.create({ data: { username } });
        res.status(201).json(user);
    }
    catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Ce nom d\'utilisateur existe déjà' });
        }
        throw err;
    }
});
// GET /api/users — liste des utilisateurs (avec leur avatar)
router.get('/', async (req, res) => {
    const users = await prisma_1.default.user.findMany({
        include: { avatar: true },
        orderBy: { id: 'asc' }
    });
    res.json(users);
});
// GET /api/users/:id — un utilisateur précis (avec son avatar)
router.get('/:id', async (req, res) => {
    const user = await prisma_1.default.user.findUnique({
        where: { id: Number(req.params.id) },
        include: { avatar: true }
    });
    if (!user)
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json(user);
});
// PATCH /api/users/:id/avatar — lie un Media (déjà uploadé via /api/media/upload) comme avatar
router.patch('/:id/avatar', async (req, res) => {
    const { mediaId } = req.body;
    if (mediaId !== null && mediaId !== undefined) {
        const media = await prisma_1.default.media.findUnique({ where: { id: Number(mediaId) } });
        if (!media)
            return res.status(404).json({ error: 'Média non trouvé' });
    }
    try {
        const user = await prisma_1.default.user.update({
            where: { id: Number(req.params.id) },
            data: { avatarId: mediaId === null || mediaId === undefined ? null : Number(mediaId) },
            include: { avatar: true }
        });
        res.json(user);
    }
    catch (err) {
        if (err.code === 'P2025') {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        throw err;
    }
});
exports.default = router;
