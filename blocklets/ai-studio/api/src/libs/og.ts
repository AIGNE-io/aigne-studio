import Deployment from '@api/store/models/deployment';
import { ProjectRepo, getEntryFromRepository } from '@api/store/repository';
import { ProjectSettings } from '@blocklet/ai-runtime/types';
import { AIGNE_STUDIO_COMPONENT_DID } from '@blocklet/aigne-sdk/constants';
import { getComponentMountPoint } from '@blocklet/sdk/lib/component';
import { env } from '@blocklet/sdk/lib/config';
import { joinURL, withQuery } from 'ufo';

import logger from './logger';
import { getMessageFromRuntime } from './runtime';

export function getProjectOpenGraphUrl(settings: ProjectSettings) {
  const url = joinURL(
    env.appUrl,
    getComponentMountPoint(AIGNE_STUDIO_COMPONENT_DID),
    '/api/projects/',
    settings.id,
    '/logo.png'
  );

  return withQuery(url, { version: settings?.updatedAt, imageFilter: 'resize', f: 'webp', w: 1200 });
}

async function getProjectSettingsAndDeployment(deploymentId?: string) {
  try {
    const deployment = await Deployment.findByPk(deploymentId);
    if (!deployment) return { settings: undefined, deployment };

    const repo = await ProjectRepo.load({ projectId: deployment.projectId });
    const settings = await repo?.projectSettings;
    return { settings, deployment };
  } catch (error) {
    logger.warn('get project settings error', { error });
    return { settings: undefined, deployment: undefined };
  }
}

const getEntryAgentProfileOgImage = async (deployment: Deployment | undefined | null) => {
  const { projectId, projectRef } = deployment ?? {};
  if (!projectId || !projectRef) return undefined;
  const agent = await getEntryFromRepository({ projectId, ref: projectRef });
  const profile = agent?.outputVariables?.find((i) => i.name === '$profile') as any;
  return profile?.initialValue?.ogImage;
};

export async function getOpenGraphInfo({
  deploymentId,
  messageId,
}: { deploymentId?: string; messageId?: string } = {}) {
  const info = {
    ogTitle: env.appName,
    ogDescription: env.appDescription,
    ogImage: joinURL(env.appUrl, '/.well-known/service/blocklet/og.png'),
  };

  try {
    const [{ settings, deployment }, message] = await Promise.all([
      getProjectSettingsAndDeployment(deploymentId),
      messageId && typeof messageId === 'string'
        ? getMessageFromRuntime({ messageId }).catch((error) => {
            logger.warn('getMessageFromRuntime error', { error });
            return undefined;
          })
        : undefined,
    ]);

    info.ogTitle = settings?.name?.slice(0, 100) || info.ogTitle;
    info.ogDescription = settings?.description?.slice(0, 100) || info.ogDescription;
    info.ogImage =
      message?.outputs?.objects?.find((i) => i.$images)?.$images?.[0]?.url ||
      (await getEntryAgentProfileOgImage(deployment)) ||
      (settings && getProjectOpenGraphUrl(settings)) ||
      info.ogImage;
  } catch (error) {
    logger.error('getOpenGraphInfo error', { error });
  }

  info.ogImage = withQuery(info.ogImage, { imageFilter: 'resize', f: 'webp', w: 1200 });

  return info;
}
