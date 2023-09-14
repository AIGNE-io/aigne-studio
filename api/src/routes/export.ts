/* eslint-disable no-await-in-loop */
import fs from 'fs';
import path from 'path';

import { Router } from 'express';
import Joi from 'joi';
import { parse, stringify } from 'yaml';

import env from '../libs/env';
import logger from '../libs/logger';
import { ensurePromptsEditor } from '../libs/security';
import { getRepository } from '../store/projects';

const templatesSchema = Joi.object({
  templates: Joi.array().items(Joi.string()).unique().required(),
});

async function deleteFolder(filepath: string) {
  const files = await fs.promises.readdir(filepath);
  for (const file of files) {
    const curPath = path.join(filepath, file);
    const stats = await fs.promises.stat(curPath);
    if (stats.isDirectory()) {
      await deleteFolder(curPath);
    } else {
      await fs.promises.unlink(curPath);
    }
  }
  await fs.promises.rmdir(filepath);
}

const TARGET_DIR = 'ai.templates';

const checkFolderExists = async (folderPath: string) => {
  try {
    await fs.promises.access(folderPath);
    return true;
  } catch (error) {
    return false;
  }
};

const getTemplateDir = async () => {
  const basePath = await fs.promises.stat(env.dataDir);
  if (!basePath) {
    await fs.promises.mkdir(env.dataDir);
  }

  const templateDir = path.join(env.dataDir, TARGET_DIR);
  return templateDir;
};

export default function exportRoutes(router: Router) {
  router.post('/export/:projectId/:ref', ensurePromptsEditor, async (req, res) => {
    const { projectId, ref } = req.params;

    if (!projectId) throw new Error('Missing required params `projectId`');

    if (!ref) throw new Error('Missing required params `ref`');

    const input = await templatesSchema.validateAsync(req.body, { stripUnknown: true });
    const paths = input.templates.map((item: string) => item.replace('.yaml', ''));

    const fns = paths.map(async (filepath: string) => {
      const repository = getRepository(projectId);
      const file = await repository.getFile({
        ref,
        path: await repository.findFile(path.parse(filepath).name, { ref }),
      });
      const data = parse(Buffer.from(file.blob).toString());
      return data;
    });

    const templates = await Promise.all(fns);
    const result = stringify({ templates: templates.map((temp) => ({ ...temp, projectId, ref })) });

    const templateDir = await getTemplateDir();
    const templateFolder = await checkFolderExists(templateDir);
    if (templateFolder) {
      await deleteFolder(templateDir);
    }
    await fs.promises.mkdir(templateDir);

    const templateFilename = path.join(templateDir, `templates-${Date.now()}.yaml`);
    await fs.promises.writeFile(templateFilename, result);

    res.json({ templates });
  });

  router.get('/export/file', ensurePromptsEditor, async (_req, res) => {
    // sdk 去 path projectId => ??
    const templateDir = await getTemplateDir();
    const templateFolder = await checkFolderExists(templateDir);

    if (templateFolder) {
      const files = await fs.promises.readdir(templateDir).catch((e) => logger.error(e));

      if (files && files.length > 0) {
        const fns = files.map(async (filepath: string) => {
          const exportFile = path.join(templateDir, filepath);
          const data = await fs.promises.readFile(exportFile, 'utf8');
          const result = parse(data);
          return result;
        });
        const list = (await Promise.all(fns)).flat();

        const [{ templates }] = list;
        const { projectId, ref } = templates[0] || {};
        return res.json({ templates, projectId, ref });
      }

      return res.json({});
    }

    return res.json({});
  });
}
