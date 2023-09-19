import fs from 'fs';
import path from 'path';

import * as git from 'isomorphic-git';
import difference from 'lodash/difference';

import Working from './working';

export interface RepositoryOptions<T> {
  root: string;
  parse: (filepath: string, content: Uint8Array) => Promise<T> | T;
  stringify: (
    filepath: string,
    content: T
  ) => Promise<string | NodeJS.ArrayBufferView> | string | NodeJS.ArrayBufferView;
}

const defaultBranchName = 'main';

export default class Repository<T> {
  static async init<T>(options: RepositoryOptions<T>) {
    if (!fs.existsSync(path.join(options.root, '.git'))) {
      fs.mkdirSync(path.dirname(options.root), { recursive: true });
      await git.init({ fs, dir: options.root });
    }
    return new Repository(options);
  }

  constructor(readonly options: RepositoryOptions<T>) {
    if (!fs.existsSync(this.gitdir)) {
      throw new Error(`repository ${this.options.root} is not initialized`);
    }
  }

  get gitdir() {
    return path.join(this.options.root, '.git');
  }

  async working({ ref }: { ref: string }) {
    return this.getOrInitWorking({ ref });
  }

  async commit({
    ref,
    message,
    author,
  }: {
    ref: string;
    message: string;
    author: {
      name: string;
      email?: string;
      timestamp?: number;
      timezoneOffset?: number;
    };
  }) {
    const { base, dir } = path.parse(this.options.root);
    const tmpdir = fs.mkdtempSync(path.join(dir, base));

    try {
      const working = await this.getOrInitWorking({ ref });

      const originalFiles = await this.listFiles({ ref });

      await git.checkout({ fs, gitdir: this.gitdir, dir: tmpdir, ref, force: true });

      const files = working.files();

      const deletedFiles = difference(
        originalFiles,
        files.map((i) => i[0])
      );

      for (const filepath of deletedFiles) {
        fs.rmSync(filepath, { recursive: true, force: true });
        await git.add({ fs, gitdir: this.gitdir, dir: tmpdir, filepath });
      }

      for (const [filepath, file] of files) {
        const p = path.join(tmpdir, filepath);
        fs.mkdirSync(path.dirname(p), { recursive: true });

        fs.writeFileSync(p, await this.options.stringify(filepath, file));

        await git.add({ fs, gitdir: this.gitdir, dir: tmpdir, filepath });
      }

      await git.commit({ fs, gitdir: this.gitdir, dir: tmpdir, message, author });

      await git.checkout({ fs, dir: this.options.root, ref: defaultBranchName, force: true });
    } finally {
      fs.rmSync(tmpdir, { recursive: true, force: true });
    }
  }

  private async listFiles({ ref }: { ref: string }) {
    return git.listFiles({ fs, gitdir: this.gitdir, ref });
  }

  private workingMap: { [key: string]: Promise<Working<T>> } = {};

  private async getOrInitWorking({ ref }: { ref: string }) {
    this.workingMap[ref] ??= (async () => {
      const { base, dir } = path.parse(this.options.root);
      const workingRoot = path.join(dir, `${base}-${ref}`);

      const exists = fs.existsSync(workingRoot);

      const working = new Working<T>({ root: workingRoot });

      if (!exists) {
        fs.mkdirSync(workingRoot, { recursive: true });

        const files = await this.listFiles({ ref });

        await working.reset({
          files,
          readFile: async (filepath) => {
            const oid = await git.resolveRef({ fs, gitdir: this.gitdir, ref });

            const content = (await git.readBlob({ fs, gitdir: this.gitdir, oid, filepath })).blob;

            return this.options.parse(filepath, content);
          },
        });

        working.save({ flush: true });
      }

      return working;
    })();

    return this.workingMap[ref]!;
  }
}
