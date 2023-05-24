import { user } from '@blocklet/sdk/lib/middlewares';
import { Request, Response, Router } from 'express';
import Joi from 'joi';
import { orderBy, uniqWith } from 'lodash';

import { ensureAdmin } from '../libs/security';
import { folders } from '../store/folders';
import { templates } from '../store/templates';

const router = Router();

const folderSchema = Joi.object<{ name?: string }>({
  name: Joi.string().empty(null),
});

export async function getFolders(_req: Request, res: Response) {
  const list = await folders.cursor().sort({ createdAt: -1 }).exec();

  res.json({
    folders: orderBy(
      uniqWith(list, (a, b) => (a.name && b.name ? a.name === b.name : false)),
      'createdAt',
      'desc'
    ),
  });
}

router.get('/', ensureAdmin, getFolders);

router.post('/', user(), ensureAdmin, async (req, res) => {
  const { name } = await folderSchema.validateAsync(req.body, { stripUnknown: true });
  const { did } = req.user!;

  if (name && (await folders.findOne({ name }))) {
    throw new Error(`Duplicated folder ${name}`);
  }

  const doc = await folders.insert({
    name,
    createdBy: did,
    updatedBy: did,
  });
  res.json(doc);
});

router.put('/:folderId', user(), ensureAdmin, async (req, res) => {
  const { folderId } = req.params;

  const folder = await folders.findOne({ $or: [{ _id: folderId }, { name: folderId }] });
  if (!folder) {
    res.status(404).json({ error: 'No such folder' });
    return;
  }

  const { name } = await folderSchema.validateAsync(req.body, { stripUnknown: true });

  if (name && (await folders.findOne({ name, _id: { $ne: folder._id } }))) {
    throw new Error(`Duplicated folder ${name}`);
  }

  const { did } = req.user!;

  const [, doc] = await folders.update(
    { _id: folderId },
    {
      $set: {
        name,
        updatedBy: did,
      },
    },
    { returnUpdatedDocs: true }
  );

  res.json(doc);
});

router.delete('/:folderId', ensureAdmin, async (req, res) => {
  const { folderId } = req.params;

  const folder = await folders.findOne({ $or: [{ _id: folderId }, { name: folderId }] });
  if (!folder) {
    res.status(404).json({ error: 'No such folder' });
    return;
  }

  await Promise.all([templates.remove({ folderId }, { multi: true }), folders.remove({ _id: folderId })]);

  res.json(folder);
});

export default router;
