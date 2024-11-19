import fastq from 'fastq';
import type { done, queue } from 'fastq';
import { Worker } from 'snowflake-uuid';

const taskIdGenerator = new Worker();
const nextTaskId = () => taskIdGenerator.nextId().toString();

export type DocumentQueue = {
  type: 'document';
  documentId: string;
};

export type Task = {
  id: string;
  job: DocumentQueue;
};

export const isDocumentQueue = (job: any): job is DocumentQueue => {
  return job && job.type === 'document';
};

const tryWithTimeout = (asyncFn: () => Promise<any>, timeout = 5000) => {
  if (typeof asyncFn !== 'function') {
    throw new Error('Must provide a valid asyncFn function');
  }

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeout} ms`));
    }, timeout);

    try {
      const result = await asyncFn();
      resolve(result);
    } catch (err) {
      reject(err);
    } finally {
      clearTimeout(timer);
    }
  });
};

const createQueue = ({
  onJob,
  options,
}: {
  onJob: (data: Task) => Promise<void>;
  options: {
    concurrency: number;
    maxTimeout: number;
    id?: (job: Task['job']) => string;
  };
}): {
  queue: queue<Task>;
  push: (job: Task['job'], jobId?: string) => void;
  checkAndPush: (job: Task['job'], jobId?: string) => void;
} => {
  const defaults = {
    concurrency: 1,
    maxTimeout: 24 * 60 * 60 * 1000,
  };

  const concurrency = Math.max(options.concurrency || defaults.concurrency, 1);
  const maxTimeout = Math.max(options.maxTimeout || defaults.maxTimeout, 0);

  const q: queue<Task> = fastq(async (data: Task, cb: done) => {
    try {
      const result = await tryWithTimeout(() => onJob(data), maxTimeout);
      cb(null, result);
    } catch (err) {
      cb(err);
    }
  }, concurrency);

  const getJobId = (jobId: string, job: any): string =>
    jobId || (typeof options.id === 'function' ? options.id(job) : nextTaskId()) || nextTaskId();

  const getJob = (id: string) => {
    const list = q.getQueue();
    return list.find((x) => x.id === id);
  };

  const getDocumentJob = (documentId: string) => {
    const list = q.getQueue();
    return Boolean(list.find((x) => x.job.documentId === documentId));
  };

  const push = (job: Task['job'], jobId?: string) => {
    if (!job) {
      throw new Error('can not queue empty job');
    }
    const id = getJobId(jobId || '', job);

    const isExist = getJob(id);
    if (isExist) return;

    setImmediate(() => {
      q.push({ id, job }, (err) => {
        if (err) console.error(err?.message);
      });
    });
  };

  const checkAndPush = (job: Task['job']) => {
    const isExit = getDocumentJob(job.documentId);
    if (isExit) return;

    push(job);
  };

  return { queue: q, push, checkAndPush };
};

export default createQueue;
