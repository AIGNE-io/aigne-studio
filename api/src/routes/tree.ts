import path from 'path';

import { user } from '@blocklet/sdk/lib/middlewares';
import dayjs from 'dayjs';
import { Router } from 'express';
import Joi from 'joi';
import { parse, stringify } from 'yaml';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { getRepository } from '../store/projects';
import { Entry, File } from '../store/repository';
import { Template, getTemplate, nextTemplateId } from '../store/templates';
import { TemplateInput, createBranches, templateSchema } from './templates';

export type EntryWithMeta = Exclude<Entry, File> | (File & { meta: Template });

export type CreateFileInput = { type: 'folder'; data: { name: string } } | { type: 'file'; data: TemplateInput };

export interface PatchFileInput {
  path: string;
}

export function treeRoutes(router: Router) {
  router.get('/projects/:projectId/tree/:ref', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId, ref } = req.params;
    if (!projectId) throw new Error('Missing required params `projectId`');

    const repository = getRepository(projectId);

    const files = await Promise.all(
      (
        await repository.getFiles({ ref })
      ).map(async (file) => {
        if (file.type === 'file') {
          return {
            ...file,
            meta: await getTemplate({ repository, ref, path: path.join(...file.parent, file.name) }),
          };
        }
        return file;
      })
    );
    res.json({ files });
  });

  router.get('/projects/:projectId/tree/:ref/:path(*.yaml)', ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId, ref, path: filepath } = req.params;
    if (!projectId || !ref || !filepath) throw new Error('Missing required params `projectId` or `ref` or `path`');

    const repository = getRepository(projectId);

    const file = await repository.getFile({ ref, path: await repository.findFile(path.parse(filepath).name, { ref }) });
    const data = parse(Buffer.from(file.blob).toString());

    res.json(data);
  });

  router.put('/projects/:projectId/tree/:ref/:path(*.yaml)', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { projectId, ref, path: filepath } = req.params;
    if (!projectId || !ref || !filepath) throw new Error('Missing required params `projectId` or `ref` or `path`');

    const { deleteEmptyTemplates, ...input } = await templateSchema.validateAsync(req.body, { stripUnknown: true });

    const { did } = req.user!;
    const repository = getRepository(projectId);

    const template = await repository.run(async (tx) => {
      await tx.checkout({ ref });

      const p = path.parse(await repository.findFile(filepath));
      const templateId = p.name;

      const template = {
        ...input,
        id: templateId,
        branch: input.branch && (await createBranches(tx, p.dir, input.branch, did)),
        updatedAt: new Date().toISOString(),
        updatedBy: did,
      };

      await tx.write({ path: filepath, data: stringify(template) });

      if (deleteEmptyTemplates) {
        for (const templateId of deleteEmptyTemplates) {
          const p = await repository.findFile(templateId, { rejectIfNotFound: false });
          if (p) {
            await tx.rm({ path: path.join(path.dirname(p), `${templateId}.yaml`) });
          }
        }
      }

      await tx.commit({ message: template.versionNote || template.updatedAt, author: { name: did, email: did } });

      return template;
    });

    res.json(template);
  });

  const createFileInputSchema = Joi.object<CreateFileInput>({
    type: Joi.string().valid('folder', 'file').required(),
  })
    .when(Joi.object({ type: Joi.valid('folder') }).unknown(), {
      then: Joi.object({
        data: Joi.object({
          name: Joi.string().required(),
        }),
      }),
    })
    .when(Joi.object({ type: Joi.valid('file') }).unknown(), {
      then: Joi.object({
        data: templateSchema,
      }),
    });

  router.post('/projects/:projectId/tree/:branch/:path(*)?', user(), ensureComponentCallOrAdmin(), async (req, res) => {
    const { did } = req.user!;
    const { projectId, branch, path: filepath } = req.params;
    if (!projectId || !branch) throw new Error('Missing required params `projectId` or `branch`');

    const input = await createFileInputSchema.validateAsync(req.body, { stripUnknown: true });

    const result = await getRepository(projectId).run(async (tx) => {
      await tx.checkout({ ref: branch });

      const author = {
        name: did,
        email: did,
        timestamp: dayjs().unix(),
        timezoneOffset: -dayjs().utcOffset(),
      };

      switch (input.type) {
        case 'folder': {
          await tx.mkdir({ path: path.join(filepath || '', input.data.name) });
          await tx.commit({ message: `Create ${path.join(filepath || '', input.data.name)}`, author });
          return input.data;
        }
        case 'file': {
          const { data } = input;

          const id = nextTemplateId();

          const template: Template = {
            ...data,
            id,
            branch: data.branch && (await createBranches(tx, filepath || '', data.branch, did)),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: did,
            updatedBy: did,
          };

          await tx.write({ path: path.join(filepath || '', `${id}.yaml`), data: stringify(template) });

          await tx.commit({ message: `Create ${template.name || id}`, author });

          return template;
        }
        default:
          throw new Error(`unsupported type ${input}`);
      }
    });

    res.json(result);
  });

  router.delete(
    '/projects/:projectId/tree/:branch/:path(*)',
    user(),
    ensureComponentCallOrAdmin(),
    async (req, res) => {
      const { did } = req.user!;
      const { projectId, branch, path } = req.params;
      if (!projectId || !branch || !path) throw new Error('Missing required params `projectId` or `branch` or `path`');

      await getRepository(projectId).run(async (tx) => {
        await tx.checkout({ ref: branch });

        await tx.rm({ path });

        await tx.commit({
          message: `Delete ${path}`,
          author: {
            name: did,
            email: did,
            timestamp: dayjs().unix(),
            timezoneOffset: -dayjs().utcOffset(),
          },
        });
      });

      res.json({});
    }
  );

  const patchFileInputSchema = Joi.object<PatchFileInput>({
    path: Joi.string().required(),
  });

  router.patch(
    '/projects/:projectId/tree/:branch/:path(*)/path',
    user(),
    ensureComponentCallOrAdmin(),
    async (req, res) => {
      const { did } = req.user!;
      const { projectId, branch, path } = req.params;
      if (!projectId || !branch || !path) throw new Error('Missing required params `projectId` or `branch` or `path`');

      const input = await patchFileInputSchema.validateAsync(req.body, { stripUnknown: true });

      await getRepository(projectId).run(async (tx) => {
        await tx.checkout({ ref: branch });

        await tx.mv({ src: path, dst: input.path });

        await tx.commit({
          message: `Move ${path} to ${input.path}`,
          author: {
            name: did,
            email: did,
            timestamp: dayjs().unix(),
            timezoneOffset: -dayjs().utcOffset(),
          },
        });
      });

      res.json({});
    }
  );
}
