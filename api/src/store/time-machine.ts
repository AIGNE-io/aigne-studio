import fs from 'fs';
import path from 'path';

import * as git from 'isomorphic-git';
import { groupBy } from 'lodash';
import { parse } from 'yaml';

import env from '../libs/env';
import { Template } from './templates';

const defaultBranch = 'main';

const relativeTemplatePath = ({ dir, templateId }: { dir?: string; templateId: string }) => {
  const filename = `${templateId}.json`;
  return path.join(dir ?? '', filename);
};

export interface File {
  type: 'file';
  name: string;
  parent: string[];
  meta: Template;
}

export interface Folder {
  type: 'folder';
  name: string;
  parent: string[];
}

export type Entry = File | Folder;

export default class Templates {
  constructor(public dir: string) {}

  static readonly root: Templates = new Templates(path.join(env.dataDir, 'time-machine/root'));

  async run<T extends (tx: Transaction) => any>(cb: T): Promise<Awaited<ReturnType<T>>> {
    await this.init();

    const tx = new Transaction(this);

    return cb(tx);
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

  async getFiles({ ref }: { ref?: string } = {}): Promise<Entry[]> {
    await this.init();

    const files: File[] = [];
    const folders: { [key: string]: Folder } = {};

    const splitPath = (p: string) => p.split(path.sep).filter(Boolean);

    const resolvedRef = await git.resolveRef({ fs, dir: this.dir, ref: ref || defaultBranch });

    for (const file of await git.listFiles({ fs, dir: this.dir, ref: resolvedRef })) {
      const { dir, base, name, ext } = path.parse(file);
      const parent = splitPath(dir);

      if (ext === '.json') {
        files.push({
          type: 'file',
          name: base,
          parent,
          meta: await this.getTemplate({ oid: resolvedRef, dir, templateId: name }),
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

  async getFile({ ref, path: p }: { ref?: string; path: string }) {
    await this.init();

    const { relativePath } = this.checkRelativePath(p);

    const oid = await git.resolveRef({ fs, dir: this.dir, ref: ref || 'main' });

    return git.readBlob({ fs, dir: this.dir, oid, filepath: relativePath });
  }

  async getBranches() {
    await this.init();

    return git.listBranches({ fs, dir: this.dir });
  }

  async createBranch({ ref, oid }: { ref: string; oid?: string }) {
    await git.branch({ fs, dir: this.dir, ref, object: oid });
  }

  async deleteBranch({ ref }: { ref: string }) {
    await git.deleteBranch({ fs, dir: this.dir, ref });
  }

  async getTemplates({ ref }: { ref?: string } = {}) {
    await this.init();

    const files = (await git.listFiles({ fs, dir: this.dir, ref })).map((i) => path.parse(i));

    return Promise.all(
      Object.entries(groupBy(files, 'dir')).map(async ([dir, files]) => ({
        dir,
        files: await Promise.all(
          files.filter((f) => f.ext === '.json').map((f) => this.getTemplate({ oid: ref, dir, templateId: f.name }))
        ),
      }))
    );
  }

  // async writeTemplate({
  //   dir,
  //   template,
  // }: {
  //   dir?: string;
  //   template: Omit<Template, '_id' | 'folderId'>;
  // }): Promise<string> {
  //   return this.run(async (tx) => {
  //     await tx.write({ path: dir, template });

  //     const updatedAt = dayjs(template.updatedAt);

  //     return tx.commit({
  //       message: template.versionNote || updatedAt.toISOString(),
  //       author: {
  //         name: template.updatedBy,
  //         email: template.updatedBy,
  //         timestamp: updatedAt.unix(),
  //         timezoneOffset: -updatedAt.utcOffset(),
  //       },
  //     });
  //   });
  // }

  async getCommits() {
    await this.init();

    return git.log({
      fs,
      dir: this.dir,
      ref: defaultBranch,
    });
  }

  async getTemplateCommits({ dir, templateId }: { dir?: string; templateId: string }) {
    await this.init();

    const filepath = relativeTemplatePath({
      dir: dir ?? (await this.findTemplate(templateId)).dir,
      templateId,
    });

    return git.log({
      fs,
      dir: this.dir,
      ref: defaultBranch,
      filepath,
      force: true,
    });
  }

  async getTemplate({ oid, dir, templateId }: { oid?: string; dir?: string; templateId: string }): Promise<Template> {
    await this.init();

    const filepath = relativeTemplatePath({
      dir: dir ?? (await this.findTemplate(templateId)).dir,
      templateId,
    });

    return parse(
      Buffer.from(
        (
          await git.readBlob({
            fs,
            dir: this.dir,
            oid: await git.resolveRef({ fs, dir: this.dir, ref: oid || defaultBranch }),
            filepath,
          })
        ).blob
      ).toString('utf-8')
    );
  }

  // async deleteTemplate({ dir, templateId, did }: { dir?: string; templateId: string; did: string }) {
  //   return this.run(async (tx) => {
  //     await tx.deleteTemplate({ dir, templateId });
  //     return tx.commit({ message: `Delete ${templateId}`, author: did });
  //   });
  // }

  // async createProject({ name, did }: { name: string; did: string }) {
  //   return this.run(async (tx) => {
  //     await tx.mkdir({ path: name });
  //     return tx.commit({ message: `Create ${name}`, author: did });
  //   });
  // }

  // async deleteProject({ name, did }: { name: string; did: string }) {
  //   return this.run(async (tx) => {
  //     await tx.rm({ name });
  //     return tx.commit({ message: `Delete ${name}`, author: did });
  //   });
  // }

  // async renameProject({ oldName, name, did }: { oldName: string; name: string; did: string }) {
  //   return this.run(async (tx) => {
  //     await tx.move({ oldName, name });
  //     return tx.commit({ message: `Rename ${oldName} to ${name}`, author: did });
  //   });
  // }

  // async moveTemplate({ templateId, projectName, did }: { templateId: string; projectName: string; did: string }) {
  //   return this.run(async (tx) => {
  //     await tx.move({ templateId, projectName });
  //     return tx.commit({ message: `Move ${templateId} to ${projectName || '/'}`, author: did });
  //   });
  // }

  async findTemplate(
    templateIdOrPath: string,
    options: { ref?: string; rejectIfNotFound: false }
  ): Promise<{ dir: string; templateId: string } | null>;
  async findTemplate(
    templateIdOrPath: string,
    options?: { ref?: string; rejectIfNotFound?: boolean }
  ): Promise<{ dir: string; templateId: string }>;
  async findTemplate(
    templateIdOrPath: string,
    { ref, rejectIfNotFound = true }: { ref?: string; rejectIfNotFound?: boolean } = {}
  ) {
    const src = (await git.listFiles({ fs, dir: this.dir, ref })).find(
      (i) => i === templateIdOrPath || path.parse(i).name === templateIdOrPath
    );
    if (!src) {
      if (!rejectIfNotFound) return null;

      throw new Error(`No such template ${templateIdOrPath}`);
    }

    const p = path.parse(src);

    return { dir: p.dir, templateId: p.name };
  }

  private checkRelativePath(p: string) {
    return checkRelativePath(this.dir, p);
  }
}

export class Transaction {
  constructor(private readonly repo: Templates) {}

  private addFilepath: string[] = [];

  private removeFilepath: string[] = [];

  async checkout({ ref }: { ref?: string }) {
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
    if (this.addFilepath.length) {
      await git.add({ fs, dir: this.repo.dir, filepath: this.addFilepath });
    }

    await Promise.all(this.removeFilepath.map((filepath) => git.remove({ fs, dir: this.repo.dir, filepath })));

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
