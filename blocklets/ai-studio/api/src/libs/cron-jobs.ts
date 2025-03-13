import Project from '@api/store/models/project';
import { CRON_FILE_PATH, ProjectRepo, defaultBranch } from '@api/store/repository';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { CronJobManager } from '@blocklet/ai-runtime/core/utils/cron-job';
import { CronFile, CronJob, randomId } from '@blocklet/ai-runtime/types';
import { runAgent } from '@blocklet/aigne-sdk/server/api/agent';
import { createCronHistory } from '@blocklet/aigne-sdk/server/api/cron-history';

import { wallet } from './auth';
import logger from './logger';

class ProjectCronManager extends CronJobManager {
  destroyProjectJobs(projectId: string) {
    super.destroyGroup({ groupId: projectId });
  }

  async reloadProjectJobs(projectId: string, { jobs }: { jobs?: CronJob[] } = {}) {
    if (!jobs) {
      const repo = await ProjectRepo.load({ projectId });
      const cronConfig = await repo.readAndParseFile<CronFile>({
        filepath: CRON_FILE_PATH,
        working: true,
        readBlobFromGitIfWorkingNotInitialized: true,
      });
      jobs = cronConfig?.jobs || [];
    }

    const reloadJobs = () => {
      logger.info('reload project jobs start', { projectId });

      const tasks = jobs
        .filter(
          (i): i is typeof i & Required<Pick<typeof i, 'agentId' | 'cronExpression'>> =>
            !!i.enable && !!i.agentId && !!i.cronExpression
        )
        .map((job) => ({
          id: job.id,
          cronTime: job.cronExpression,
          onTick: async () => {
            const startTime = new Date();
            logger.info('run agent cron job start', { projectId, job });
            const { outputs, error } = await runAgent({
              // TODO: currently use application did as user did, should be replaced with real user did
              user: { did: wallet.address },
              aid: stringifyIdentity({ projectId, projectRef: defaultBranch, agentId: job.agentId }),
              working: true,
              sessionId: randomId(),
              inputs: job.inputs,
              runType: 'cron',
            })
              .then((outputs) => {
                logger.info('run agent cron job success', { projectId, job, outputs });
                return { outputs, error: undefined };
              })
              .catch((error: Error) => {
                logger.error('run agent cron job error', { projectId, job, error });
                return { error, outputs: undefined };
              });

            await createCronHistory({
              startTime: startTime.toISOString(),
              endTime: new Date().toISOString(),
              projectId,
              agentId: job.agentId,
              cronJobId: job.id,
              inputs: job.inputs || {},
              outputs,
              error: error && { message: error.message },
            }).catch((error) => {
              logger.error('failed to create cron history', { projectId, job, error });
            });
          },
        }));

      this.resetJobs(tasks, { groupId: projectId });

      logger.info('reload project jobs end', { projectId, jobs: tasks.length });
    };

    reloadJobs();
  }

  async reloadAllProjectsJobs() {
    this.destroy();

    for (const p of await Project.findAll()) {
      await this.reloadProjectJobs(p.id);
    }
  }
}

export const projectCronManager = new ProjectCronManager();
