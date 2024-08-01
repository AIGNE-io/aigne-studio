import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { CronJobManager, Job } from '@blocklet/ai-runtime/core/utils/cron-job';
import { randomId } from '@blocklet/ai-runtime/types';
import { runAgent } from '@blocklet/aigne-sdk/server/api/agent';
import constants from '@blocklet/constant';
import config from '@blocklet/sdk/lib/config';
import throttle from 'lodash/throttle';

import logger from './logger';
import { initResources } from './resource';

const RELOAD_CRON_JOBS_THROTTLE = 3000;

class AgentCronManager extends CronJobManager {
  destroyBlockletJobs(blockletDid: string) {
    super.destroyGroup({ groupId: blockletDid });
  }

  async reloadBlockletJobs(blockletDid: string) {
    this.destroyBlockletJobs(blockletDid);

    const blocklet = (await initResources()).agents.application?.blockletMap[blockletDid];
    if (blocklet?.status !== constants.BlockletStatus.running) return;

    const projects = Object.values(blocklet.projectMap);

    const cronJobs = projects
      .flatMap((i) => i.cronConfig?.jobs?.map((j) => ({ ...j, projectId: i.project.id })) ?? [])
      .filter(
        (i): i is typeof i & Required<Pick<typeof i, 'agentId' | 'cronExpression'>> =>
          !!i?.agentId && !!i.cronExpression && !!i.enable
      );

    const reloadJobs = () => {
      logger.info('reload blocklet jobs start', { blockletDid });

      const jobs: Job[] = cronJobs.map((job) => ({
        id: job.id,
        cronTime: job.cronExpression,
        onTick: async () => {
          try {
            logger.info('run agent cron job start', { projectId: blockletDid, job });
            const result = await runAgent({
              // TODO: currently use application did as user did, should be replaced with real user did
              user: { did: blockletDid },
              blockletDid,
              aid: stringifyIdentity({ projectId: job.projectId, agentId: job.agentId }),
              sessionId: randomId(),
              inputs: job.inputs,
            });
            logger.info('run agent cron job success', { blockletDid, job, result });
          } catch (error) {
            logger.error('run agent cron job error', { blockletDid, job, error });
          }
        },
      }));

      this.resetJobs(jobs, { groupId: blockletDid });

      logger.info('reload blocklet jobs end', { blockletDid, jobs: jobs.length });
    };

    reloadJobs();
  }

  async reloadAllProjectsJobs() {
    this.destroy();

    const resource = await initResources();
    const blocklets = Object.values(resource.agents.application?.blockletMap ?? {});

    for (const p of blocklets) {
      await this.reloadBlockletJobs(p.blockletDid);
    }
  }

  override destroy() {
    super.destroy();
  }
}

export const cronManager = new AgentCronManager();

const onComponentsChange = throttle(
  (components: { did: string }[]) => {
    for (const i of components) {
      cronManager.reloadBlockletJobs(i.did);
    }
  },
  RELOAD_CRON_JOBS_THROTTLE,
  { leading: false, trailing: true }
);

config.events.on(config.Events.componentStarted, onComponentsChange);
config.events.on(config.Events.componentStopped, onComponentsChange);
config.events.on(config.Events.componentUpdated, onComponentsChange);

import.meta.hot?.on('vite:beforeFullReload', () => {
  cronManager.destroy();
});
import.meta.hot?.dispose(() => {
  cronManager.destroy();
});
