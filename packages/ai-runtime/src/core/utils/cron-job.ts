import { CronJob } from 'cron';

export const CronJobDefaultGroup = 'default';

export type Job = { id: string; cronTime: string; onTick: () => void };

export class CronJobManager {
  private groups: { [groupId: string]: { jobs: { [jobId: string]: { job: Job; cronJob: CronJob } } } } = {};

  resetJobs(jobs: Job[], { groupId = CronJobDefaultGroup }: { groupId?: string } = {}) {
    this.destroyGroup({ groupId });

    for (const job of jobs) {
      this.resetJob(job, { groupId });
    }
  }

  resetJob(job: Job, { groupId = CronJobDefaultGroup }: { groupId?: string } = {}) {
    if (!job.cronTime) throw new Error('cronTime is required');

    this.groups[groupId] ??= { jobs: {} };
    const group = this.groups[groupId]!;

    this.stopJob(job.id, { groupId });

    const cronJob = CronJob.from({ cronTime: job.cronTime, onTick: job.onTick, utcOffset: 0, start: true });
    group.jobs[job.id] = { cronJob, job };
  }

  stopJob(jobId: string, { groupId = CronJobDefaultGroup }: { groupId?: string } = {}) {
    const group = this.groups[groupId];
    if (!group) return;

    const item = group.jobs[jobId];
    if (!item) return;

    item.cronJob.stop();

    delete group.jobs[jobId];
  }

  private destroyGroup({ groupId }: { groupId: string }) {
    const group = this.groups[groupId];
    if (!group) return;

    for (const item of Object.values(group.jobs)) {
      this.stopJob(item.job.id, { groupId });
    }

    delete this.groups[groupId];
  }

  destroy() {
    for (const groupId of Object.keys(this.groups)) {
      this.destroyGroup({ groupId });
    }
  }
}
