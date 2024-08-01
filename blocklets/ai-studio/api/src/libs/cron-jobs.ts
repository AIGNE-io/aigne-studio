import Project from '@api/store/models/project';
import { CRON_FILE_PATH, ProjectRepo, defaultBranch } from '@api/store/repository';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { CronJobManager, Job } from '@blocklet/ai-runtime/core/utils/cron-job';
import { CronFileYjs, randomId } from '@blocklet/ai-runtime/types';
import { runAgent } from '@blocklet/aigne-sdk/server/api/agent';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { throttle } from 'lodash';

import { wallet } from './auth';
import logger from './logger';

const RELOAD_CRON_JOBS_THROTTLE = 3000;

class ProjectCronManager extends CronJobManager {
  private projectObservers: Record<string, { unobserve?: () => void }> = {};

  destroyProjectJobs(projectId: string) {
    super.destroyGroup({ groupId: projectId });
  }

  async reloadProjectJobs(projectId: string) {
    const repo = await ProjectRepo.load({ projectId });
    const working = await repo.working({ ref: defaultBranch });
    const cronConfig = working.syncedStore.files[CRON_FILE_PATH] as CronFileYjs;

    const reloadJobs = () => {
      logger.info('reload project jobs start', { projectId });

      const jobs: Job[] = (cronConfig.jobs ?? [])
        .map((i) => JSON.parse(JSON.stringify(i)))
        .filter(
          (i): i is typeof i & Required<Pick<typeof i, 'agentId' | 'cronExpression'>> =>
            !!i.enable && !!i.agentId && !!i.cronExpression
        )
        .map((job) => ({
          id: job.id,
          cronTime: job.cronExpression,
          onTick: async () => {
            try {
              logger.info('run agent cron job start', { projectId, job });
              const result = await runAgent({
                // TODO: currently use application did as user did, should be replaced with real user did
                user: { did: wallet.address },
                aid: stringifyIdentity({ projectId, projectRef: defaultBranch, agentId: job.agentId }),
                working: true,
                sessionId: randomId(),
                inputs: job.inputs,
              });
              logger.info('run agent cron job success', { projectId, job, result });
            } catch (error) {
              logger.error('run agent cron job error', { projectId, job, error });
            }
          },
        }));

      this.resetJobs(jobs, { groupId: projectId });

      logger.info('reload project jobs end', { projectId, jobs: jobs.length });
    };

    reloadJobs();

    // observe cronConfig file changes and reload jobs
    {
      this.projectObservers[projectId]?.unobserve?.();
      this.projectObservers[projectId] = {};

      const file = getYjsValue(cronConfig) as Map<any>;

      const reloadJobsIfNeeded = throttle(
        () => {
          reloadJobs();
        },
        RELOAD_CRON_JOBS_THROTTLE,
        { leading: false, trailing: true }
      );
      file.observeDeep(reloadJobsIfNeeded);

      const observer = this.projectObservers[projectId];
      observer.unobserve = () => {
        file.unobserveDeep(reloadJobsIfNeeded);
        observer.unobserve = undefined;
      };
    }
  }

  async reloadAllProjectsJobs() {
    this.destroy();

    for (const p of await Project.findAll()) {
      await this.reloadProjectJobs(p.id);
    }
  }

  override destroy() {
    for (const i of Object.values(this.projectObservers)) {
      i.unobserve?.();
    }
    super.destroy();
  }
}

export const projectCronManager = new ProjectCronManager();

import.meta.hot?.on('vite:beforeFullReload', () => {
  projectCronManager.destroy();
});
import.meta.hot?.dispose(() => {
  projectCronManager.destroy();
});
