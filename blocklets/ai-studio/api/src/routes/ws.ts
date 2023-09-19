import path from 'path';

import { Repository } from '@blocklet/co-git';
import express from 'express';
import { parse, stringify } from 'yaml';

import env from '../libs/env';
import { ensurePromptsEditor } from '../libs/security';
import { Template } from '../store/templates';

const router = express.Router();

export default router;

const repositories: { [key: string]: Promise<Repository<Template | { $base64: string }>> } = {};

async function getOrInitRepositories({ projectId }: { projectId: string }) {
  repositories[projectId] ??= (async () => {
    const repository = await Repository.init<Template | { $base64: string }>({
      root: path.join(env.dataDir, 'repositories', projectId),
      parse: async (filepath, content) => {
        if (path.extname(filepath) === '.yaml') {
          return parse(Buffer.from(content).toString());
        }

        // FIXME: type checkout not working for next line
        return {
          $base64: Buffer.from(content).toString('base64'),
        };
      },
      stringify: async (filepath, content) => {
        if (path.extname(filepath) === '.yaml') {
          return stringify(content);
        }

        const base64 = (content as any).$base64;

        return typeof base64 === 'string' ? Buffer.from(base64, 'base64') : '';
      },
    });
    return repository;
  })();

  return repositories[projectId]!;
}

router.use(ensurePromptsEditor).ws('/ws/:projectId/:ref', async (conn, req) => {
  const { projectId, ref } = req.params;
  if (!projectId || !ref) throw new Error('Missing required params projectId or ref');

  const repository = await getOrInitRepositories({ projectId });
  const working = await repository.working({ ref });
  working.addConnection(conn);
});
