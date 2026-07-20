import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import sharp, { FormatEnum } from 'sharp';
import path from 'path';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import storage from '../lib/storage';
import cache from '../lib/redis';

const router = express.Router();

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

const FORMAT_MIME_TYPES: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif'
};
const MAX_TRANSFORM_DIMENSION = 2000;
const TRANSFORM_CACHE_TTL = Number(process.env.TRANSFORM_CACHE_TTL || 3600);

// POST /api/media/upload — upload d'une image avec redimensionnement automatique
router.post('/upload', upload.single('image'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier envoyé (champ 'image' attendu)" });
    }

    const extension = path.extname(req.file.originalname).toLowerCase() || '.jpg';
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${extension}`;

    // Redimensionne l'image (largeur max 800px, hauteur automatique) avant de la stocker
    const { data: buffer, info } = await sharp(req.file.buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .toBuffer({ resolveWithObject: true });

    const url = await storage.saveFile(buffer, filename, req.file.mimetype);

    const media = await prisma.media.create({
      data: {
        filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: info.size,
        width: info.width!,
        height: info.height!,
        url
      }
    });

    res.status(201).json(media);
  } catch (err) {
    next(err);
  }
});

// GET /api/media — liste de tous les médias
router.get('/', async (req: Request, res: Response) => {
  const medias = await prisma.media.findMany({ orderBy: { id: 'desc' } });
  res.json(medias);
});

// GET /api/media/:id — un média précis
router.get('/:id', async (req: Request, res: Response) => {
  const media = await prisma.media.findUnique({ where: { id: Number(req.params.id) } });
  if (!media) return res.status(404).json({ error: 'Média non trouvé' });
  res.json(media);
});

// GET /api/media/:id/transform — transformation à la volée (resize/format), avec cache Redis
router.get('/:id/transform', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const media = await prisma.media.findUnique({ where: { id: Number(req.params.id) } });
    if (!media) return res.status(404).json({ error: 'Média non trouvé' });

    const width = req.query.width ? Number(req.query.width) : undefined;
    const height = req.query.height ? Number(req.query.height) : undefined;
    const quality = req.query.quality ? Number(req.query.quality) : undefined;
    const format = req.query.format as string | undefined;

    if (width !== undefined && (!Number.isInteger(width) || width <= 0 || width > MAX_TRANSFORM_DIMENSION)) {
      return res.status(400).json({ error: `"width" doit être un entier entre 1 et ${MAX_TRANSFORM_DIMENSION}` });
    }
    if (height !== undefined && (!Number.isInteger(height) || height <= 0 || height > MAX_TRANSFORM_DIMENSION)) {
      return res.status(400).json({ error: `"height" doit être un entier entre 1 et ${MAX_TRANSFORM_DIMENSION}` });
    }
    if (format !== undefined && !FORMAT_MIME_TYPES[format]) {
      return res.status(400).json({ error: `"format" doit être l'un de : ${Object.keys(FORMAT_MIME_TYPES).join(', ')}` });
    }
    if (quality !== undefined && (!Number.isInteger(quality) || quality < 1 || quality > 100)) {
      return res.status(400).json({ error: '"quality" doit être un entier entre 1 et 100' });
    }

    const cacheKey = `media:transform:${media.id}:${width || ''}x${height || ''}:${format || 'orig'}:${quality || ''}`;
    const contentType = format ? FORMAT_MIME_TYPES[format] : media.mimeType;

    const cached = await cache.getCache(cacheKey);
    if (cached) {
      res.set('Content-Type', contentType);
      res.set('X-Cache', 'HIT');
      return res.send(Buffer.from(cached, 'base64'));
    }

    const original = await storage.getBuffer(media.filename);
    let pipeline = sharp(original);

    if (width || height) {
      pipeline = pipeline.resize({ width, height, withoutEnlargement: true });
    }
    if (format) {
      pipeline = pipeline.toFormat(format as keyof FormatEnum, quality ? { quality } : undefined);
    }

    const transformed = await pipeline.toBuffer();

    await cache.setCache(cacheKey, transformed.toString('base64'), TRANSFORM_CACHE_TTL);

    res.set('Content-Type', contentType);
    res.set('X-Cache', 'MISS');
    res.send(transformed);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/media/:id — supprime le fichier stocké et l'entrée en base
router.delete('/:id', async (req: Request, res: Response) => {
  const media = await prisma.media.findUnique({ where: { id: Number(req.params.id) } });
  if (!media) return res.status(404).json({ error: 'Média non trouvé' });

  await storage.deleteFile(media.filename);
  await prisma.media.delete({ where: { id: media.id } });

  res.status(204).send();
});

// Gestion des erreurs d'upload (fichier trop gros, mauvais format, etc.)
router.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(400).json({ error: err.message });
});

export default router;
