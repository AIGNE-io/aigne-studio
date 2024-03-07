import { ListObjectsCommand, ListObjectsCommandOutput, SpaceClient } from '@did-space/client';
import { Request, Response } from 'express';

import { wallet } from '../../libs/auth';

export async function listProjects(req: Request, res: Response) {
  const { endpoint } = req.query as { endpoint: string };

  const spaceClient = new SpaceClient({
    wallet,
    endpoint,
  });

  const output: ListObjectsCommandOutput = await spaceClient.send(
    new ListObjectsCommand({
      key: 'repositories/',
      recursive: false,
      ignoreDirectories: false,
    })
  );

  const projects = output.filter((x) => !x.name.endsWith('.cooperative')).map((x) => x.metadata);

  return res.send(projects);
}
