import { rmSync } from 'fs';

import { call, getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import { Request, Response, Router } from 'express';
import mime from 'mime-types';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { joinURL } from 'ufo';

import { Config } from '../libs/env';

const router = Router();

const generateFilename = () => `${Date.now()}-${nanoid()}`;

const upload = multer({
  storage: multer.diskStorage({
    destination: Config.uploadDir,
    filename: (_, file, cb) => {
      cb(null, `${generateFilename()}.${mime.extension(file.mimetype)}`);
    },
  }),
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files can be uploaded'));
    }
    return cb(null, true);
  },
});

const maxImageCount = config.env.preferences.maxImageCount || 1;
router.post('/upload', upload.array('images', maxImageCount), async (req: Request, res: Response) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    res.status(400).json({ error: 'Please select an image to upload' });
    return;
  }

  try {
    const uploadPromises = files.map(async (file) => {
      const { data: result } = await call<{ filename: string }>({
        name: 'image-bin',
        path: '/api/sdk/uploads',
        headers: { 'x-user-did': config.env.appId },
        data: { type: 'path', data: file.path, filename: file.originalname },
      });

      return {
        url: joinURL(config.env.appUrl, getComponentMountPoint('image-bin'), 'uploads', result.filename),
      };
    });

    const results = await Promise.all(uploadPromises);
    res.json({ uploads: results });
  } finally {
    files.forEach((file) => {
      try {
        rmSync(file.path, { recursive: true, force: true });
      } catch (err) {
        console.error(`Failed to remove file ${file.path}:`, err);
      }
    });
  }
});

export default router;
