const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const typesAutorises = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!typesAutorises.includes(file.mimetype)) {
      return cb(new Error('Format non supporté (jpeg, png, webp ou gif uniquement)'));
    }
    cb(null, true);
  }
});

// POST /api/media/upload — upload d'une image avec redimensionnement automatique
router.post('/upload', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier envoyé (champ 'image' attendu)" });
    }

    const extension = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;
    const filePath = path.join(uploadsDir, filename);

    // Redimensionne l'image (largeur max 800px, hauteur automatique) avant de l'écrire sur le disque
    const info = await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .toFile(filePath);

    const media = await prisma.media.create({
      data: {
        filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: info.size,
        width: info.width,
        height: info.height,
        url: `/uploads/${filename}`
      }
    });

    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
});

// GET /api/media — liste de tous les médias
router.get('/', async (req, res) => {
  const medias = await prisma.media.findMany({ orderBy: { id: 'desc' } });
  res.json(medias);
});

// GET /api/media/:id — un média précis
router.get('/:id', async (req, res) => {
  const media = await prisma.media.findUnique({ where: { id: Number(req.params.id) } });
  if (!media) return res.status(404).json({ error: 'Média non trouvé' });
  res.json(media);
});

// DELETE /api/media/:id — supprime le fichier sur disque et l'entrée en base
router.delete('/:id', async (req, res) => {
  const media = await prisma.media.findUnique({ where: { id: Number(req.params.id) } });
  if (!media) return res.status(404).json({ error: 'Média non trouvé' });

  fs.rm(path.join(uploadsDir, media.filename), { force: true }, () => {});
  await prisma.media.delete({ where: { id: media.id } });

  res.status(204).send();
});

// Gestion des erreurs d'upload (fichier trop gros, mauvais format, etc.)
router.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

module.exports = router;
