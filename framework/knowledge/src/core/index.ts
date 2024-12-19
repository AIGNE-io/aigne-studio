import { Document, IKnowledgeBase, KnowledgeBaseInfo, SearchParams } from '@aigne/core';
import { mkdir, pathExists, readFile, writeFile } from 'fs-extra';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';

import { initStore } from '../store';
import Retriever from './retriever';

export class KnowledgeBase<I extends object = object, O = object> implements IKnowledgeBase<I, O> {
  private knowledgePath: string = '';
  private knowledgeDBPath: string = '';
  private knowledgeVectorsFolderPath: string = '';
  private knowledgeSourcesFolderPath: string = '';
  private knowledgeProcessedFolderPath: string = '';

  constructor() {}

  static async load(path: string) {
    const instance = new KnowledgeBase();

    instance.knowledgePath = joinURL(path, 'knowledge.yml');
    instance.knowledgeDBPath = `sqlite:${path}/knowledge.db`;
    instance.knowledgeVectorsFolderPath = joinURL(path, 'vectors');
    instance.knowledgeSourcesFolderPath = joinURL(path, 'sources');
    instance.knowledgeProcessedFolderPath = joinURL(path, 'processed');

    if (!(await pathExists(path))) {
      await mkdir(path, { recursive: true });
    }

    if (!(await pathExists(instance.knowledgePath))) {
      await writeFile(instance.knowledgePath, stringify({}));
    }

    await initStore({
      url: instance.knowledgeDBPath,
      isDevelopment: process.env.NODE_ENV === 'development',
    });

    if (!(await pathExists(instance.knowledgeVectorsFolderPath))) {
      await mkdir(instance.knowledgeVectorsFolderPath, { recursive: true });
    }

    if (!(await pathExists(instance.knowledgeSourcesFolderPath))) {
      await mkdir(instance.knowledgeSourcesFolderPath, { recursive: true });
    }

    if (!(await pathExists(instance.knowledgeProcessedFolderPath))) {
      await mkdir(instance.knowledgeProcessedFolderPath, { recursive: true });
    }

    return instance;
  }

  async update(info: Partial<KnowledgeBaseInfo>): Promise<KnowledgeBaseInfo> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));
    await writeFile(this.knowledgePath, stringify({ ...knowledge, ...info }));

    return { ...knowledge, ...info };
  }

  async delete(): Promise<void> {
    await writeFile(this.knowledgePath, stringify({}));
  }

  async addDocuments(documents: Document[]): Promise<Document[]> {
    return documents;
  }

  async removeDocuments(documentIds: string[]): Promise<void> {
    throw new Error('Not implemented');
  }

  async search(params: SearchParams): Promise<any> {
    return new Retriever(this.knowledgeVectorsFolderPath, params.k).search(params.query);
  }

  async run(params: any): Promise<any> {
    return new Retriever(this.knowledgeVectorsFolderPath, params.k).search(params.query);
  }
}
