import { readFileSync } from 'fs';
import { resolve } from 'path';

import { getAgentFromAIStudio } from '@api/libs/ai-studio';
import logger from '@api/libs/logger';
import { getResourceProjects } from '@api/libs/resource';
import { parseIdentity, stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { GetAgentResult } from '@blocklet/ai-runtime/core';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import {
  RUNTIME_RESOURCE_BLOCKLET_STATE_GLOBAL_VARIABLE,
  RuntimeResourceBlockletState,
} from '@blocklet/ai-runtime/types/runtime/runtime-resource-blocklet-state';
import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config, { getBlockletJs } from '@blocklet/sdk/lib/config';
import { Express, Router } from 'express';
import Mustache from 'mustache';
import { joinURL, withQuery } from 'ufo';
import type { ViteDevServer } from 'vite';

import { getMessageById } from './message';

export default function setupHtmlRouter(app: Express, viteDevServer?: ViteDevServer) {
  const template = viteDevServer
    ? readFileSync(resolve(process.env.BLOCKLET_APP_DIR!, 'index.html'), 'utf-8')
    : readFileSync(resolve(process.env.BLOCKLET_APP_DIR!, 'dist/index.html'), 'utf-8');

  const router = Router();

  const loadHtml = async (req: any) => {
    const resourceBlockletState: RuntimeResourceBlockletState = {
      applications: [],
    };

    const componentId = req.get('x-blocklet-component-id')?.split('/').at(-1);
    const blockletDid = componentId !== AIGNE_RUNTIME_COMPONENT_DID ? componentId : undefined;
    const projects = await getResourceProjects({ blockletDid, type: 'application' });
    const apps = projects
      .map((i) => {
        const entry = i.config?.entry;
        if (!entry) return undefined;

        const entryAgent = i.assistants.find((j) => j.id === entry);
        if (!entryAgent) return undefined;

        return {
          blockletDid: i.blocklet.did,
          aid: stringifyIdentity({ projectId: i.project.id, agentId: entry }),
          project: i.project,
        };
      })
      .filter((i): i is NonNullable<typeof i> => !!i);

    resourceBlockletState.applications.push(...apps);

    let html = template;

    if (viteDevServer) {
      const template = readFileSync(resolve(__dirname, '../../../index.html'), 'utf-8');
      const url = req.originalUrl;
      html = await viteDevServer.transformIndexHtml(url, template);
    }

    try {
      const previewAid = req.path.match(/\/preview\/(?<aid>\w+)/)?.groups?.aid;

      const app = previewAid
        ? {
            blockletDid: undefined,
            ...(await getAgentFromAIStudio({ ...parseIdentity(previewAid, { rejectWhenError: true }), working: true })),
            aid: previewAid,
          }
        : resourceBlockletState.applications[0];

      html = Mustache.render(html, {
        ogTitle: app?.project.name || '',
        ogDescription: app?.project.description || '',
        ogImage: app ? getAgentOgImageUrl(app) : '',
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

    return { html, resourceBlockletState, blockletDid };
  };

  router.get('/message/:messageId/:aid/:blockletDid?', async (req, res) => {
    const { html: tplHtml, resourceBlockletState } = await loadHtml(req);
    let html = tplHtml;
    let message;
    let agent: GetAgentResult | undefined;
    const app = resourceBlockletState.applications[0];

    const { aid, blockletDid, messageId } = req.params;

    try {
      message = await getMessageById({ messageId });
    } catch (error) {
      logger.error('message not found', { error });
    }

    try {
      const { projectId, projectRef, assistantId } = parseIdentity(aid, { rejectWhenError: true });
      agent = await getAgent({ blockletDid, projectId, projectRef, agentId: assistantId });

      if (!agent) {
        throw new Error(`agent ${assistantId} not found`);
      }
    } catch (error) {
      logger.error('agent not found', { error });
    }

    try {
      html = Mustache.render(html, {
        ogTitle: agent?.name || agent?.project?.name || '',
        ogDescription: message?.outputs?.content || agent?.description || agent?.project?.description || '',
        ogImage:
          message?.outputs?.objects?.[0]?.[RuntimeOutputVariable.images]?.[0].url ||
          (blockletDid && app?.project.id
            ? joinURL(config.env.appUrl, '/.well-known/service/blocklet/logo-bundle', blockletDid)
            : ''),
      });
    } catch (error) {
      logger.error('render html error', { error });
    }

    res.send(html);
  });

  router.get('/*', async (req, res) => {
    const { html: tplHtml, resourceBlockletState, blockletDid } = await loadHtml(req);

    let html = tplHtml;

    try {
      const previewAid = req.path.match(/\/preview\/(?<aid>\w+)/)?.groups?.aid;

      const app = previewAid
        ? {
            blockletDid: undefined,
            ...(await getAgentFromAIStudio({ ...parseIdentity(previewAid, { rejectWhenError: true }), working: true })),
            aid: previewAid,
          }
        : resourceBlockletState.applications[0];

      html = Mustache.render(html, {
        ogTitle: app?.project.name || '',
        ogDescription: app?.project.description || '',
        ogImage: app ? getAgentOgImageUrl(app) : '',
      });
    } catch (error) {
      logger.error('render html error', { error });
    }

    res.send(html);
  });

  app.use(router);
}

function getAgentOgImageUrl({ blockletDid, aid }: { blockletDid?: string; aid: string }) {
  return withQuery(
    joinURL(config.env.appUrl, getComponentMountPoint(AIGNE_RUNTIME_COMPONENT_DID), '/api/agents', aid, 'logo'),
    { blockletDid, imageFilter: 'resize', w: 200 }
  );
}
