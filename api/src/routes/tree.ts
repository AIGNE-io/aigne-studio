import { join } from 'path';

import { user } from '@blocklet/sdk/lib/middlewares';
import dayjs from 'dayjs';
import { Router } from 'express';
import Joi from 'joi';
import { parse, stringify } from 'yaml';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { Template, nextTemplateId } from '../store/templates';
import Templates from '../store/time-machine';
import { TemplateInput, createBranches, templateSchema } from './templates';

const router = Router();

router.get('/:ref', ensureComponentCallOrAdmin(), async (req, res) => {
  const { ref } = req.params;
  const files = await Templates.root.getFiles({ ref });
  res.json({ files });
});

router.get('/:ref/:path(*.json)', ensureComponentCallOrAdmin(), async (req, res) => {
  const { ref, path } = req.params;
  if (!ref || !path) throw new Error('Missing required params `ref` or `path`');

  const file = await Templates.root.getFile({ ref, path });
  const data = parse(Buffer.from(file.blob).toString());

  res.json(data);
});

router.put('/:ref/:path(*.json)', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { ref, path } = req.params;
  if (!ref || !path) throw new Error('Missing required params `ref` or `path`');

  const { deleteEmptyTemplates, ...input } = await templateSchema.validateAsync(req.body, { stripUnknown: true });

  const { did } = req.user!;

  const template = await Templates.root.run(async (tx) => {
    await tx.checkout({ ref });

    const { dir, templateId } = await Templates.root.findTemplate(path);

    const template = {
      ...input,
      id: templateId,
      branch: input.branch && (await createBranches(tx, dir, input.branch, did)),
      updatedAt: new Date().toISOString(),
      updatedBy: did,
    };

    await tx.write({ path, data: stringify(template) });

    if (deleteEmptyTemplates) {
      for (const templateId of deleteEmptyTemplates) {
        const p = await Templates.root.findTemplate(templateId, { rejectIfNotFound: false });
        if (p) await tx.rm({ path: join(p.dir, `${templateId}.json`) });
      }
    }

    await tx.commit({ message: template.versionNote || template.updatedAt, author: { name: did, email: did } });

    return template;
  });

  res.json(template);
});

export type CreateFileInput = { type: 'folder'; data: { name: string } } | { type: 'file'; data: TemplateInput };

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

router.post('/:branch/:path(*)?', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { did } = req.user!;
  const { branch, path } = req.params;
  if (!branch) throw new Error('Missing required params `branch`');

  const input = await createFileInputSchema.validateAsync(req.body, { stripUnknown: true });

  const result = await Templates.root.run(async (tx) => {
    await tx.checkout({ ref: branch });

    const author = {
      name: did,
      email: did,
      timestamp: dayjs().unix(),
      timezoneOffset: -dayjs().utcOffset(),
    };

    switch (input.type) {
      case 'folder': {
        await tx.mkdir({ path: join(path || '', input.data.name) });
        await tx.commit({ message: `Create ${join(path || '', input.data.name)}`, author });
        return input.data;
      }
      case 'file': {
        const { data } = input;

        const id = nextTemplateId();

        const template: Template = {
          ...data,
          id,
          branch: data.branch && (await createBranches(tx, path || '', data.branch, did)),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: did,
          updatedBy: did,
        };

        await tx.write({ path: join(path || '', `${id}.json`), data: stringify(template) });

        await tx.commit({ message: `Create ${template.name || id}`, author });

        return template;
      }
      default:
        throw new Error(`unsupported type ${input}`);
    }
  });

  res.json(result);
});

router.delete('/:branch/:path(*)', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { did } = req.user!;
  const { branch, path } = req.params;
  if (!branch || !path) throw new Error('Missing required params `branch` or `path`');

  await Templates.root.run(async (tx) => {
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
});

export interface PatchFileInput {
  path: string;
}

const patchFileInputSchema = Joi.object<PatchFileInput>({
  path: Joi.string().required(),
});

router.patch('/:branch/:path(*)/path', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { did } = req.user!;
  const { branch, path } = req.params;
  if (!branch || !path) throw new Error('Missing required params `branch` or `path`');

  const input = await patchFileInputSchema.validateAsync(req.body, { stripUnknown: true });

  await Templates.root.run(async (tx) => {
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
});

export default router;
