import { join } from 'path';

import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { stringify } from 'yaml';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { Template } from '../store/templates';
import Templates from '../store/time-machine';
import { templateSchema } from './templates';

const router = Router();

export const importBodySchema = Joi.object<{ branch: string; path: string; templates?: Template[] }>({
  branch: Joi.string().required(),
  path: Joi.string().allow('').required(),
  templates: Joi.array()
    .items(
      templateSchema.concat(
        Joi.object({
          id: Joi.string().required(),
          createdAt: Joi.string().empty(Joi.valid(null, '')),
          updatedAt: Joi.string().empty(Joi.valid(null, '')),
          createdBy: Joi.string().empty(Joi.valid(null, '')),
          updatedBy: Joi.string().empty(Joi.valid(null, '')),
        })
      )
    )
    .required(),
});

router.post('/', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { did } = req.user!;

  const { branch, path, templates } = await importBodySchema.validateAsync(req.body, { stripUnknown: true });

  if (templates?.length) {
    await Templates.root.run(async (tx) => {
      await tx.checkout({ ref: branch });

      for (const template of templates) {
        await tx.write({ path: join(path, `${template.id}.json`), data: stringify(template) });
      }

      await tx.commit({ message: 'Import templates', author: { name: did, email: did } });
    });
  }

  res.json({});
});

export default router;
