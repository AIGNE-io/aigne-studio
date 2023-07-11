import path from 'path';

import { user } from '@blocklet/sdk/lib/middlewares';
import dayjs from 'dayjs';
import { Router } from 'express';
import Joi from 'joi';
import { parse, stringify } from 'yaml';

import { ensureComponentCallOrAdmin } from '../libs/security';
import { Entry, File } from '../store/repository';
import { Template, defaultRepository, getTemplate, nextTemplateId } from '../store/templates';
import { TemplateInput, createBranches, templateSchema } from './templates';

const router = Router();

export type EntryWithMeta = Exclude<Entry, File> | (File & { meta: Template });

router.get('/:ref', ensureComponentCallOrAdmin(), async (req, res) => {
  const { ref } = req.params;
  const files = await Promise.all(
    (
      await defaultRepository.getFiles({ ref })
    ).map(async (file) => {
      if (file.type === 'file') {
        return {
          ...file,
          meta: await getTemplate({ ref, path: path.join(...file.parent, file.name) }),
        };
      }
      return file;
    })
  );
  res.json({ files });
});

router.get('/:ref/:path(*.yaml)', ensureComponentCallOrAdmin(), async (req, res) => {
  const { ref, path: filepath } = req.params;
  if (!ref || !filepath) throw new Error('Missing required params `ref` or `path`');

  const file = await defaultRepository.getFile({ ref, path: filepath });
  const data = parse(Buffer.from(file.blob).toString());

  res.json(data);
});

router.put('/:ref/:path(*.yaml)', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { ref, path: filepath } = req.params;
  if (!ref || !filepath) throw new Error('Missing required params `ref` or `path`');

  const { deleteEmptyTemplates, ...input } = await templateSchema.validateAsync(req.body, { stripUnknown: true });

  const { did } = req.user!;

  const template = await defaultRepository.run(async (tx) => {
    await tx.checkout({ ref });

    const p = path.parse(await defaultRepository.findFile(filepath));
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
        const p = await defaultRepository.findFile(templateId, { rejectIfNotFound: false });
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
  const { branch, path: filepath } = req.params;
  if (!branch) throw new Error('Missing required params `branch`');

  const input = await createFileInputSchema.validateAsync(req.body, { stripUnknown: true });

  const result = await defaultRepository.run(async (tx) => {
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

router.delete('/:branch/:path(*)', user(), ensureComponentCallOrAdmin(), async (req, res) => {
  const { did } = req.user!;
  const { branch, path } = req.params;
  if (!branch || !path) throw new Error('Missing required params `branch` or `path`');

  await defaultRepository.run(async (tx) => {
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

  await defaultRepository.run(async (tx) => {
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
