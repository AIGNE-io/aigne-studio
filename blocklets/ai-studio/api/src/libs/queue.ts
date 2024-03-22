import fastq from 'fastq';
import type { done, queue } from 'fastq';
import { Worker } from 'snowflake-uuid';

const taskIdGenerator = new Worker();
const nextTaskId = () => taskIdGenerator.nextId().toString();

type Task = {
  id: string;
  job: { [key: string]: any };
  persist: boolean;
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
    id?: any;
  };
}): {
  queue: queue<Task>;
  push: (...args: any[]) => void;
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

  const push = (...args: any[]) => {
    let job: Task['job'];
    let jobId;
    let persist;

    if (
      args.length === 1 &&
      args[0] &&
      typeof args[0] === 'object' &&
      (args[0].job || args[0].jobId || args[0].persist)
    ) {
      [{ job, jobId, persist = true }] = args;
    } else {
      [job, jobId, persist = true] = args;
    }

    if (!job) {
      throw new Error('Can not queue empty job');
    }

    const id = getJobId(jobId, job);

    setImmediate(() => {
      q.push({ id, job, persist }, () => {});
    });
  };

  return { queue: q, push };
};

export default createQueue;
