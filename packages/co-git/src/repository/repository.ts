import fs from 'fs';
import { mkdir } from 'fs/promises';
import path from 'path';

import { pathExists } from 'fs-extra';
import * as git from 'isomorphic-git';
import http from 'isomorphic-git/http/node';
import Queue from 'queue';

import Working from './working';

export interface RepositoryOptions<T> {
  root: string;
  parse: (
    filepath: string,
    content: Uint8Array,
    option: { ref: string }
  ) =>
    | Promise<{
        filepath: string;
        key: string;
        data: T;
      } | null>
    | { filepath: string; key: string; data: T }
    | null;
  stringify: (
    filepath: string,
    content: T
  ) =>
    | Promise<
        | Array<{ filepath: string; data: string | NodeJS.ArrayBufferView }>
        | { filepath: string; data: string | NodeJS.ArrayBufferView }
        | null
      >
    | Array<{ filepath: string; data: string | NodeJS.ArrayBufferView }>
    | { filepath: string; data: string | NodeJS.ArrayBufferView }
    | null;
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
    if (!(await pathExists(path.join(options.root, '.git')))) {
      await mkdir(path.dirname(options.root), { recursive: true });
      await git.init({ fs, dir: options.root, defaultBranch });
    }

    const repo = new Repository(options);

    if (initialCommit) {
      const defaultBranchExists = !!(await ignoreNotFoundError(repo.listBranches()))?.includes(defaultBranch);
      if (!defaultBranchExists || !(await ignoreNotFoundError(repo.log({ ref: defaultBranch })))?.length) {
        await repo.transact(async (tx) => {
          if (!defaultBranchExists) await repo.branch({ ref: defaultBranch });
          else await tx.checkout({ ref: defaultBranch, force: true });
          await tx.commit(initialCommit);
        });
      }
    }

    return repo;
  }

  constructor(readonly options: RepositoryOptions<T>) {}

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

      const exists = await pathExists(workingRoot);

      const working = await Working.load(this, { ref, root: workingRoot });

      if (!exists) {
        await mkdir(workingRoot, { recursive: true });
        await working.reset();
        working.save({ flush: true });
      }

      return working;
    })();

    return this.workingMap[ref]!;
  }

  async flush() {
    for (const i of Object.values(this.workingMap)) {
      await (await i).save({ flush: true });
    }
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

  async statusMatrix(options?: Omit<Parameters<typeof git.statusMatrix>[0], 'fs' | 'dir' | '.gitdir'>) {
    return git.statusMatrix({ fs, dir: this.root, ...options });
  }

  async listRemotes() {
    return git.listRemotes({ fs, dir: this.root });
  }

  async getRemoteInfo(options: Omit<Parameters<typeof git.getRemoteInfo>[0], 'http'>) {
    return git.getRemoteInfo({ http, ...options });
  }

  async addRemote({ remote, url, force }: { remote: string; url: string; force?: boolean }) {
    return git.addRemote({ fs, dir: this.root, remote, url, force });
  }

  async deleteRemote({ remote }: { remote: string }) {
    return git.deleteRemote({ fs, dir: this.root, remote });
  }

  async push(options?: Omit<Parameters<typeof git.push>[0], 'fs' | 'http' | 'dir'>) {
    return git.push({
      fs,
      http,
      dir: this.root,
      ...options,
    });
  }

  async pull(options?: Omit<Parameters<typeof git.pull>[0], 'fs' | 'http' | 'dir'>) {
    return git.pull({
      fs,
      http,
      dir: this.root,
      ...options,
    });
  }

  async fetch(options?: Omit<Parameters<typeof git.fetch>[0], 'fs' | 'http' | 'dir'>) {
    return git.fetch({
      fs,
      http,
      dir: this.root,
      ...options,
    });
  }

  async checkout(options?: Omit<Parameters<typeof git.checkout>[0], 'fs' | 'dir'>) {
    return git.checkout({
      fs,
      dir: this.root,
      ...options,
    });
  }

  async abortMerge(options?: Omit<Parameters<typeof git.abortMerge>[0], 'fs' | 'dir'>) {
    return git.abortMerge({
      fs,
      dir: this.root,
      ...options,
    });
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

  async destroy() {
    for (const i of await Promise.all(Object.values(this.workingMap))) {
      i.destroy();
    }
  }
}

export class Transaction<T> {
  constructor(public readonly repo: Repository<T>) {}

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
