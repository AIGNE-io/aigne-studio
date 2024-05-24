import { readFile } from 'fs/promises';
import path from 'path';

import { BlockletStatus } from '@blocklet/constant';
import { components } from '@blocklet/sdk/lib/config';
import { Router } from 'express';
import { joinURL } from 'ufo';
import { parse } from 'yaml';

import { PROTOCOL, PROTOCOL_API, PROTOCOL_API_LIST } from './const';
import ComponentSDK from './sdk';

const getBuildInComponents = () => {
  const mountPoints = components
    .filter((x) => x.status === BlockletStatus.running && !!x.webEndpoint)
    .map((component: any) => {
      return {
        componentName: joinURL(component.name),
        component,
      };
    });

  const sdk = new ComponentSDK(mountPoints);
  return sdk.getFilterList();
};

export const getComponentsRouter = () => {
  const router = Router();

  router.get(PROTOCOL_API, async (_req, res) => {
    const filePath = path.join(process.env.BLOCKLET_APP_DIR!, PROTOCOL);
    const json: { name: string; url: string }[] = parse((await readFile(filePath)).toString());
    res.json(json || []);
  });

  router.get(PROTOCOL_API_LIST, async (_req, res) => {
    res.json(await getBuildInComponents());
  });

  return router;
};
