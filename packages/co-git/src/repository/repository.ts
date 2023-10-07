import fs from 'fs';
import path from 'path';

import * as git from 'isomorphic-git';
import Queue from 'queue';

import Working from './working';

export interface RepositoryOptions<T> {
  root: string;
  parse: (filepath: string, content: Uint8Array) => Promise<T> | T;
  stringify: (
    filepath: string,
    content: T
  ) => Promise<string | NodeJS.ArrayBufferView> | string | NodeJS.ArrayBufferView;
}

export default class Repository<T> {
  static async init<T>({
    initialCommit,
    defaultBranch = 'main',
    ...options
  }: RepositoryOptions<T> & {
    initialCommit?: Pick<Parameters<typeof git.commit>[0], 'message' | 'author'>;
    defaultBranch?: string;
  }) {
    if (!fs.existsSync(path.join(options.root, '.git'))) {
      fs.mkdirSync(path.dirname(options.root), { recursive: true });
      await git.init({ fs, dir: options.root, defaultBranch });
    }

    const repo = new Repository(options);

    if (initialCommit) {
      const defaultBranchExists = !!(await ignoreNotFoundError(repo.listBranches()))?.includes(defaultBranch);
      if (!defaultBranchExists || !(await ignoreNotFoundError(repo.log({ ref: defaultBranch })))?.length) {
        await repo.transact(async (tx) => {
          if (!defaultBranchExists) await repo.branch({ ref: defaultBranch });
          await tx.checkout({ ref: defaultBranch, force: true });
          await tx.commit(initialCommit);
        });
      }
    }

    return repo;
  }

  constructor(readonly options: RepositoryOptions<T>) {
    if (!fs.existsSync(this.gitdir)) {
      throw new Error(`repository ${this.root} is not initialized`);
    }
  }

  get root() {
    return this.options.root;
  }

  private queue = new Queue({ autostart: true, concurrency: 1 });

  async transact<F extends (tx: Transaction<T>) => any>(cb: F): Promise<Awaited<ReturnType<F>>> {
    return new Promise<Awaited<ReturnType<F>>>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const tx = new Transaction(this);

          const res = await cb(tx);
          resolve(res);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  get gitdir() {
    return path.join(this.root, '.git');
  }

  private workingMap: { [key: string]: Promise<Working<T>> } = {};

  async working({ ref }: { ref: string }) {
    this.workingMap[ref] ??= (async () => {
      const { base, dir } = path.parse(this.root);
      const workingRoot = path.join(dir, `${base}.cooperative`, ref);

      const exists = fs.existsSync(workingRoot);

      const working = new Working(this, { ref, root: workingRoot });

      if (!exists) {
        fs.mkdirSync(workingRoot, { recursive: true });
        await working.reset();
        working.save({ flush: true });
      }

      return working;
    })();

    return this.workingMap[ref]!;
  }

  async listFiles({ ref }: { ref: string }) {
    return git.listFiles({ fs, gitdir: this.gitdir, ref });
  }

  async resolveRef({ ref }: { ref: string }) {
    return git.resolveRef({ fs, dir: this.root, ref });
  }

  async listBranches() {
    return git.listBranches({ fs, dir: this.root });
  }

  async branch(options: Omit<Parameters<typeof git.branch>[0], 'fs' | 'dir' | '.gitdir'>) {
    return git.branch({ fs, dir: this.root, ...options });
  }

  async renameBranch({ ref, oldRef }: { ref: string; oldRef: string }) {
    await git.renameBranch({ fs, gitdir: this.gitdir, ref, oldref: oldRef });
  }

  async deleteBranch({ ref }: { ref: string }) {
    await git.deleteBranch({ fs, gitdir: this.gitdir, ref });
  }

  async log({ ref, filepath }: { ref: string; filepath?: string }) {
    return git.log({ fs, gitdir: this.gitdir, ref, filepath, force: true, follow: true });
  }

  async readBlob({ ref, filepath }: { ref: string; filepath: string }) {
    const oid = await git.resolveRef({ fs, gitdir: this.gitdir, ref });

    return git.readBlob({ fs, gitdir: this.gitdir, oid, filepath });
  }

  async findFile(filenameOrPath: string, options: { ref: string; rejectIfNotFound: false }): Promise<string | null>;
  async findFile(filenameOrPath: string, options: { ref: string; rejectIfNotFound?: boolean }): Promise<string>;
  async findFile(
    filenameOrPath: string,
    { ref, rejectIfNotFound = true }: { ref: string; rejectIfNotFound?: boolean }
  ) {
    const filepath = (await git.listFiles({ fs, gitdir: this.gitdir, ref })).find((i) => {
      if (i === filenameOrPath) return true;
      const p = path.parse(i);
      return p.name === filenameOrPath || p.base === filenameOrPath;
    });
    if (!filepath) {
      if (!rejectIfNotFound) return null;

      throw new Error(`No such file ${filenameOrPath}`);
    }

    return filepath;
  }
}

export class Transaction<T> {
  constructor(private readonly repo: Repository<T>) {}

  async checkout(options: Omit<Parameters<typeof git.checkout>[0], 'fs' | 'dir' | '.gitdir'>) {
    await git.checkout({ fs, dir: this.repo.root, ...options });
  }

  async add(options: Omit<Parameters<typeof git.add>[0], 'fs' | 'dir' | '.gitdir'>) {
    return git.add({ fs, dir: this.repo.root, ...options });
  }

  async remove(options: Omit<Parameters<typeof git.remove>[0], 'fs' | 'dir' | '.gitdir'>) {
    return git.remove({ fs, dir: this.repo.root, ...options });
  }

  async commit(options: Omit<Parameters<typeof git.commit>[0], 'fs' | 'dir' | '.gitdir'>) {
    return git.commit({ fs, dir: this.repo.root, ...options });
  }
}

export async function ignoreNotFoundError<T>(value: Promise<T>): Promise<T | undefined> {
  try {
    return await value;
  } catch (error) {
    if (error instanceof git.Errors.NotFoundError) {
      return undefined;
    }
    throw error;
  }
}
