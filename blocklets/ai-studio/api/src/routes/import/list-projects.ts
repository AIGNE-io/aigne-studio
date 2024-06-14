import { projectSettingsSchema } from '@blocklet/ai-runtime/types';
import { ListObjectsCommand, ListObjectsCommandOutput, SpaceClient } from '@did-space/client';
import { Request, Response } from 'express';
import Joi from 'joi';

import { wallet } from '../../libs/auth';

const listProjectsQuerySchema = Joi.object<{
  endpoint: string;
}>({
  endpoint: Joi.string()
    .uri({ scheme: ['https', 'http'] })
    .required(),
});

export async function listProjects(req: Request, res: Response) {
  const { endpoint } = await listProjectsQuerySchema.validateAsync(req.query);

  const spaceClient = new SpaceClient({
    wallet,
    endpoint,
  });

  const { data: output }: ListObjectsCommandOutput = await spaceClient.send(
    new ListObjectsCommand({
      key: 'repositories/',
      recursive: false,
      ignoreDirectories: false,
    })
  );

  const projects = output
    .filter((x) => !x.name.endsWith('.cooperative'))
    .map((x) => {
      const r = projectSettingsSchema.validate(x.metadata);
      return r.error ? undefined : r.value;
    })
    .filter(Boolean);

  return res.send(projects);
}
