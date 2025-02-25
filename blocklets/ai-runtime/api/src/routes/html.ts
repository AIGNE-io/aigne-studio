import { readFileSync } from 'fs';
import { resolve } from 'path';

import { getAgent } from '@api/libs/agent';
import { NotFoundError } from '@api/libs/error';
import logger from '@api/libs/logger';
import { resourceManager } from '@api/libs/resource';
import History from '@api/store/models/history';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { GetAgentResult } from '@blocklet/ai-runtime/core';
import { BlockletAgent } from '@blocklet/ai-runtime/types';
import {
  RUNTIME_RESOURCE_BLOCKLET_STATE_GLOBAL_VARIABLE,
  RuntimeResourceBlockletState,
} from '@blocklet/ai-runtime/types/runtime/runtime-resource-blocklet-state';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { getAgentProfile } from '@blocklet/aigne-sdk/utils/agent';
import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import { getBlockletJs } from '@blocklet/sdk/lib/config';
import { Express, Request, Router } from 'express';
import Mustache from 'mustache';
import type { ViteDevServer } from 'vite';

import { respondAgentFields } from './agent';

const ASSETS_PATTERNS = ['/assets/'];

export default function setupHtmlRouter(app: Express, viteDevServer?: ViteDevServer) {
  const template = viteDevServer
    ? readFileSync(resolve(process.env.BLOCKLET_APP_DIR!, 'index.html'), 'utf-8')
    : readFileSync(resolve(process.env.BLOCKLET_APP_DIR!, 'dist/index.html'), 'utf-8');

  const router = Router();

  const loadHtml = async (req: Request) => {
    const resourceBlockletState: RuntimeResourceBlockletState = {
      applications: [],
    };

    const componentId = req.get('x-blocklet-component-id')?.split('/').at(-1);
    const blockletDid = componentId !== AIGNE_RUNTIME_COMPONENT_DID ? componentId : undefined;
    const projects = await resourceManager.getProjects({ blockletDid, type: 'application' });

    const apps = projects
      .map((i) => {
        const entry = i.config?.entry;
        if (!entry) return undefined;

        const entryAgent = i.agents.find((j) => j.id === entry);
        if (!entryAgent) return undefined;

        return respondAgentFields({
          agent: entryAgent,
          identity: {
            aid: stringifyIdentity({
              blockletDid: i.blocklet.did,
              projectId: i.project.id,
              agentId: entryAgent.id,
            }),
          },
          project: i.project,
        });
      })
      .filter(isNonNullable);

    resourceBlockletState.applications.push(...apps);

    let html = template;

    if (viteDevServer) {
      const template = readFileSync(resolve(__dirname, '../../../index.html'), 'utf-8');
      const url = req.originalUrl;
      html = await viteDevServer.transformIndexHtml(url, template);
    }

    const previewAid = req.path.match(/\/preview\/(?<aid>\w+)/)?.groups?.aid;

    const app = previewAid
      ? await (async () => {
          const agent = await getAgent({
            aid: previewAid,
            working: true,
            rejectOnEmpty: true,
          });
          return respondAgentFields({
            agent,
            identity: agent.identity,
            project: agent.project,
          });
        })()
      : resourceBlockletState.applications[0];

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

    return { html, app };
  };

  router.get('/messages/:messageId', async (req, res) => {
    const { html: template } = await loadHtml(req);

    let message: History | undefined;
    let agent: Exclude<GetAgentResult, BlockletAgent> | undefined;
    const { messageId } = req.params;

    try {
      message = await History.findByPk(messageId, { rejectOnEmpty: new NotFoundError('No such message') });
    } catch (error) {
      logger.error('message not found', { error });
    }

    const { projectId, blockletDid, agentId, projectRef } = message as History;
    try {
      agent = await getAgent({
        aid: stringifyIdentity({ blockletDid, projectRef, projectId, agentId }),
        working: true,
      });
    } catch (error) {
      logger.error('agent not found', { error });
    }

    let html;
    try {
      const info = agent && getAgentProfile(agent);

      const question = message?.inputs?.question;
      const answer = message?.outputs?.objects?.find((i) => i.$text)?.$text;

      let ogImage: string | undefined;
      if (typeof messageId === 'string') {
        const image = message?.outputs?.objects?.find((i) => i.$images)?.$images?.[0]?.url;
        if (image) ogImage = image;
      }

      html = Mustache.render(template, {
        ogTitle: (question || info?.name || '').slice(0, 100),
        ogDescription: (answer || info?.description || '').slice(0, 100),
        ogImage: ogImage || info?.ogImage || info?.icon || '',
      });
    } catch (error) {
      logger.error('render html error', { error });
    }

    res.send(html);
  });

  router.get('/*', async (req, res, next) => {
    if (ASSETS_PATTERNS.some((i) => req.path.startsWith(i))) {
      next();
      return;
    }

    const { html: template, app } = await loadHtml(req);

    let html;
    try {
      const { messageId } = req.query;
      let ogImage: string | undefined;
      if (typeof messageId === 'string') {
        const message = await History.findByPk(messageId);
        const image = message?.outputs?.objects?.find((i) => i.$images)?.$images?.[0]?.url;
        if (image) ogImage = image;
      }

      const info = app && getAgentProfile(app);

      html = Mustache.render(template, {
        ogTitle: (info?.name || '').slice(0, 100),
        ogDescription: (info?.description || '').slice(0, 100),
        ogImage: ogImage || info?.ogImage || info?.icon || '',
      });
    } catch (error) {
      logger.error('render html error', { error });
    }

    res.send(html);
  });

  app.use(router);
}
