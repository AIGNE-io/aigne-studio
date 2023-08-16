import fs from 'fs';
import path from 'path';

import * as git from 'isomorphic-git';
import Queue from 'queue';

export const defaultBranch = 'main';

export interface File {
  type: 'file';
  name: string;
  parent: string[];
}

export interface Folder {
  type: 'folder';
  name: string;
  parent: string[];
}

export type Entry = File | Folder;

export default class Repository {
  constructor(public dir: string) {}

  private queue = new Queue({ autostart: true, concurrency: 1 });

  async run<T extends (tx: Transaction) => any>(cb: T): Promise<Awaited<ReturnType<T>>> {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await this.init();

          const tx = new Transaction(this);

          const res = await cb(tx);
          resolve(res);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  private initPromise?: Promise<void>;

  private async init() {
    this.initPromise ??= (async () => {
      if (!fs.existsSync(this.dir)) {
        await git.init({
          fs,
          dir: this.dir,
          defaultBranch,
        });
      }
    })();

    return this.initPromise;
  }

  async isEmpty({ ref }: { ref?: string }) {
    try {
      await git.log({ fs, dir: this.dir, ref });
      return false;
    } catch (error) {
      if (error instanceof git.Errors.NotFoundError) {
        return true;
      }
      throw error;
    }
  }

  async getFiles({ ref }: { ref?: string } = {}): Promise<Entry[]> {
    ref ||= defaultBranch;

    if (await this.isEmpty({ ref })) return [];

    await this.init();

    const files: File[] = [];
    const folders: { [key: string]: Folder } = {};

    const splitPath = (p: string) => p.split(path.sep).filter(Boolean);

    const resolvedRef = await git.resolveRef({ fs, dir: this.dir, ref });

    for (const file of await git.listFiles({ fs, dir: this.dir, ref: resolvedRef })) {
      const { dir, base } = path.parse(file);
      const parent = splitPath(dir);

      if (base !== '.gitkeep') {
        files.push({
          type: 'file',
          name: base,
          parent,
        });
      }

      for (let i = 0; i < parent.length; i++) {
        const names = parent.slice(0, i + 1);
        const folderKey = names.join('-');
        folders[folderKey] ??= {
          type: 'folder',
          name: parent[i]!,
          parent: parent.slice(0, i),
        };
      }
    }

    return [...Object.values(folders), ...files];
  }

  async getFile({ ref, path: filepath }: { ref?: string; path: string }) {
    ref ||= defaultBranch;

    await this.init();

    const { relativePath } = this.checkRelativePath(filepath);

    const oid = await git.resolveRef({ fs, dir: this.dir, ref });

    return git.readBlob({ fs, dir: this.dir, oid, filepath: relativePath });
  }

  async getBranches() {
    await this.init();

    if (await this.isEmpty({ ref: defaultBranch })) {
      return [defaultBranch];
    }

    return git.listBranches({ fs, dir: this.dir });
  }

  async createBranch({ ref, oid }: { ref: string; oid?: string }) {
    await git.branch({ fs, dir: this.dir, ref, object: oid });
  }

  async renameBranch({ ref, oldRef }: { ref: string; oldRef: string }) {
    await git.renameBranch({ fs, dir: this.dir, ref, oldref: oldRef });
  }

  async deleteBranch({ ref }: { ref: string }) {
    await git.deleteBranch({ fs, dir: this.dir, ref });
  }

  async log({ ref, path: filepath }: { ref?: string; path?: string } = {}) {
    if (await this.isEmpty({ ref })) return [];

    ref ||= defaultBranch;

    await this.init();

    return git.log({ fs, dir: this.dir, ref, filepath, force: true, follow: true });
  }

  async findFile(filenameOrPath: string, options: { ref?: string; rejectIfNotFound: false }): Promise<string | null>;
  async findFile(filenameOrPath: string, options?: { ref?: string; rejectIfNotFound?: boolean }): Promise<string>;
  async findFile(
    filenameOrPath: string,
    { ref, rejectIfNotFound = true }: { ref?: string; rejectIfNotFound?: boolean } = {}
  ) {
    if ((await this.isEmpty({ ref })) && !rejectIfNotFound) return null;

    const filepath = (await git.listFiles({ fs, dir: this.dir, ref })).find((i) => {
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

  private checkRelativePath(p: string) {
    return checkRelativePath(this.dir, p);
  }
}

export class Transaction {
  constructor(private readonly repo: Repository) {}

  private addFilepath: string[] = [];

  private removeFilepath: string[] = [];

  async checkout({ ref }: { ref: string }) {
    if (await this.repo.isEmpty({ ref })) {
      return;
    }
    if (!(await git.listBranches({ fs, dir: this.repo.dir })).includes(ref)) {
      throw new Error('only support checkout a branch');
    }

    await git.resetIndex({ fs, dir: this.repo.dir, filepath: '.' });
    await git.checkout({ fs, dir: this.repo.dir, ref, force: true });
  }

  async mkdir({ path: p }: { path: string }): Promise<this> {
    const { relativePath, absolutePath } = this.checkRelativePath(p);

    const filepath = path.join(relativePath, '.gitkeep');
    const fullPath = path.join(absolutePath, '.gitkeep');

    // TODO: touch .gitkeep in ancestor folders
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    // NOTE: create a empty file named .gitkeep
    fs.closeSync(fs.openSync(fullPath, 'w'));

    this.addFilepath.push(filepath);

    return this;
  }

  async rm({ path: p }: { path: string }): Promise<this> {
    const { absolutePath, relativePath } = this.checkRelativePath(p);

    fs.rmSync(absolutePath, { recursive: true });

    this.removeFilepath.push(relativePath);

    return this;
  }

  async mv({ src, dst }: { src: string; dst: string }): Promise<this> {
    const { absolutePath: absoluteSrc, relativePath: relativeSrc } = this.checkRelativePath(src);
    const { absolutePath: absoluteDst, relativePath: relativeDst } = this.checkRelativePath(dst);

    if (absoluteSrc === absoluteDst) throw new Error('src and dst must be different');

    // TODO: mkdir ancestor of dst and touch .gitkeep in ancestor folders
    fs.renameSync(absoluteSrc, absoluteDst);

    this.addFilepath.push(relativeDst);
    this.removeFilepath.push(relativeSrc);

    return this;
  }

  async write({ path: p, data }: { path: string; data: string }): Promise<this> {
    const { absolutePath, relativePath } = this.checkRelativePath(p);

    // TODO: mkdir ancestor of dst and touch .gitkeep in ancestor folders
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });

    fs.writeFileSync(absolutePath, data);

    this.addFilepath.push(relativePath);

    return this;
  }

  async commit({
    message,
    author,
  }: {
    message: string;
    author: { name: string; email: string; timestamp?: number; timezoneOffset?: number };
  }) {
    await Promise.all(this.removeFilepath.map((filepath) => git.remove({ fs, dir: this.repo.dir, filepath })));

    if (this.addFilepath.length) {
      await git.add({ fs, dir: this.repo.dir, filepath: this.addFilepath });
    }

    return git.commit({
      fs,
      dir: this.repo.dir,
      message,
      author,
    });
  }

  private checkRelativePath(p: string) {
    return checkRelativePath(this.repo.dir, p);
  }
}

function checkRelativePath(base: string, p: string) {
  const absolutePath = path.join(base, p);
  const relativePath = path.relative(base, absolutePath);

  if (relativePath.startsWith('..')) {
    throw new Error('path must be a relative path within the repository');
  }

  return { relativePath, absolutePath };
}
