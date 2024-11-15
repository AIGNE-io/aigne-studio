import CronHistory from '@api/store/models/cron-history';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { CronJobManager, Job } from '@blocklet/ai-runtime/core/utils/cron-job';
import { randomId } from '@blocklet/ai-runtime/types';
import { runAgent } from '@blocklet/aigne-sdk/server/api/agent';
import { BlockletStatus } from '@blocklet/constant';
import config from '@blocklet/sdk/lib/config';
import throttle from 'lodash/throttle';

import logger from './logger';
import { resourceManager } from './resource';

const RELOAD_CRON_JOBS_THROTTLE = 3000;

class AIGNECronManager extends CronJobManager {
  destroyBlockletJobs(blockletDid: string) {
    super.destroyGroup({ groupId: blockletDid });
  }

  async reloadBlockletJobs(blockletDid: string) {
    this.destroyBlockletJobs(blockletDid);

    const blocklet = (await resourceManager.resources).agents.application?.blockletMap[blockletDid];
    if (blocklet?.status !== BlockletStatus.running) return;

    const projects = Object.values(blocklet.projectMap);

    const cronJobs = projects
      .flatMap((i) => i.cron?.jobs?.map((j) => ({ ...j, projectId: i.project.id })) ?? [])
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
          const startTime = new Date();

          logger.info('run agent cron job start', { projectId: blockletDid, job });
          const { outputs, error } = await runAgent({
            // TODO: currently use application did as user did, should be replaced with real user did
            user: { did: blockletDid },
            aid: stringifyIdentity({ blockletDid, projectId: job.projectId, agentId: job.agentId }),
            sessionId: randomId(),
            inputs: job.inputs,
          })
            .then((outputs) => {
              logger.info('run agent cron job success', { blockletDid, job, outputs });
              return { outputs, error: undefined };
            })
            .catch((error) => {
              logger.error('run agent cron job error', { blockletDid, job, error });
              return { outputs: undefined, error };
            });

          await CronHistory.create({
            startTime,
            endTime: new Date(),
            blockletDid,
            projectId: job.projectId,
            agentId: job.agentId,
            cronJobId: job.id,
            inputs: job.inputs,
            outputs,
            error: error && { message: error.message },
          }).catch((error) => {
            logger.error('failed to create cron history', { blockletDid, job, error });
          });
        },
      }));

      this.resetJobs(jobs, { groupId: blockletDid });

      logger.info('reload blocklet jobs end', { blockletDid, jobs: jobs.length });
    };

    reloadJobs();
  }

  async reloadAllProjectsJobs() {
    this.destroy();

    const resources = await resourceManager.resources;
    const blocklets = Object.values(resources.agents.application?.blockletMap ?? {});

    for (const p of blocklets) {
      await this.reloadBlockletJobs(p.did);
    }
  }

  override destroy() {
    super.destroy();
  }
}

export const cronManager = new AIGNECronManager();

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
