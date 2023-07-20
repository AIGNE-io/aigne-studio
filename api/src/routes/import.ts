import { join } from 'path';

import { user } from '@blocklet/sdk/lib/middlewares';
import { Router } from 'express';
import Joi from 'joi';
import { stringify } from 'yaml';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { getRepository } from '../store/projects';
import { Template } from '../store/templates';
import { templateSchema } from './templates';

export const importBodySchema = Joi.object<{
  branch: string;
  path: string;
  templates?: Template[];
}>({
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
export function importRoutes(router: Router) {
  router.post('/projects/:projectId/import', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { did } = req.user!;
    const { projectId } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const { branch, path, templates } = await importBodySchema.validateAsync(req.body, { stripUnknown: true });

    const repository = getRepository(projectId);

    if (templates?.length) {
      await repository.run(async (tx) => {
        await tx.checkout({ ref: branch });

        for (const template of templates) {
          const old = await repository.findFile(`${template.id}.yaml`, { ref: branch, rejectIfNotFound: false });
          if (old) await tx.rm({ path: old });

          await tx.write({ path: join(path, `${template.id}.yaml`), data: stringify(template) });
        }

        await tx.commit({ message: 'Import templates', author: { name: did, email: did } });
      });
    }

    res.json({});
  });
}
