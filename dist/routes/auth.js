"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const validate_1 = require("../middlewares/validate");
const AuthDto_1 = require("../dto/AuthDto");
const router = express_1.default.Router();
router.post('/register', (0, validate_1.validateBody)(AuthDto_1.RegisterDto), async (req, res) => {
    const { username, password } = req.body;
    const hashed = await bcrypt_1.default.hash(password, 10);
    try {
        const user = await prisma_1.default.user.create({ data: { username, password: hashed } });
        res.status(201).json({ id: user.id, username: user.username });
    }
    catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Ce nom d\'utilisateur existe déjà' });
        }
        throw err;
    }
});
router.post('/login', (0, validate_1.validateBody)(AuthDto_1.LoginDto), async (req, res) => {
    const { username, password } = req.body;
    const user = await prisma_1.default.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt_1.default.compare(password, user.password))) {
        return res.status(401).json({ error: 'Identifiants invalides' });
    }
    const token = jsonwebtoken_1.default.sign({ userId: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '2h' });
    res.json({ token });
});
exports.default = router;
