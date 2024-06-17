import { readFileSync } from 'fs';
import { resolve } from 'path';

import logger from '@api/libs/logger';
import { getResourceBlockletFromResource } from '@api/libs/resource';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import {
  RUNTIME_RESOURCE_BLOCKLET_STATE_GLOBAL_VARIABLE,
  RuntimeResourceBlockletState,
} from '@blocklet/ai-runtime/types/runtime/runtime-resource-blocklet-state';
import { getComponentMountPoint } from '@blocklet/sdk';
import config, { getBlockletJs } from '@blocklet/sdk/lib/config';
import { Express, Router } from 'express';
import Mustache from 'mustache';
import { joinURL } from 'ufo';
import type { ViteDevServer } from 'vite';

export default function setupHtmlRouter(app: Express, viteDevServer?: ViteDevServer) {
  const template = viteDevServer
    ? readFileSync(resolve(process.env.BLOCKLET_APP_DIR!, 'index.html'), 'utf-8')
    : readFileSync(resolve(process.env.BLOCKLET_APP_DIR!, 'dist/index.html'), 'utf-8');

  const router = Router();

  router.get('/*', async (req, res) => {
    const resourceBlockletState: RuntimeResourceBlockletState = {
      applications: [],
    };

    const blockletDid = req.get('x-blocklet-component-id')?.split('/').at(-1);
    if (blockletDid) {
      const blocklet = await getResourceBlockletFromResource({ blockletDid, type: 'application' });
      const projects = blocklet?.projectMap && Object.values(blocklet.projectMap);
      const apps = projects
        ?.map((i) => {
          const entry = i.config?.entry;
          if (!entry) return undefined;

          const entryAgent = i.agentMap[entry];
          if (!entryAgent) return undefined;

          return {
            blockletDid,
            aid: stringifyIdentity({ projectId: i.project.id, projectRef: 'main', assistantId: entry }),
            project: i.project,
          };
        })
        .filter((i): i is NonNullable<typeof i> => !!i);

      if (apps?.length) resourceBlockletState.applications.push(...apps);
    }

    let html = template;

    if (viteDevServer) {
      const template = readFileSync(resolve(__dirname, '../../../index.html'), 'utf-8');
      const url = req.originalUrl;
      html = await viteDevServer.transformIndexHtml(url, template);
    }

    try {
      const app = resourceBlockletState.applications[0];

      html = Mustache.render(html, {
        ogTitle: app?.project.name || '',
        ogDescription: app?.project.description || '',
        ogImage:
          blockletDid && app?.project.id
            ? joinURL(config.env.appUrl, '/.well-known/service/blocklet/logo-bundle', blockletDid)
            : '',
      });
    } catch (error) {
      logger.error('render html error', { error });
    }

    html = html.replace(
      '<!-- INJECT_HEAD_ELEMENTS -->',
      `\
<script>
var ${RUNTIME_RESOURCE_BLOCKLET_STATE_GLOBAL_VARIABLE} = ${JSON.stringify(resourceBlockletState)};
</script>
      `
    );

    const blockletJs = getBlockletJs(undefined, blockletDid ? getComponentMountPoint(blockletDid) : undefined);
    if (blockletJs) {
      html = html.replace('<script src="__blocklet__.js"></script>', `<script>${blockletJs}</script>`);
    }

    res.send(html);
  });

  app.use(router);
}
