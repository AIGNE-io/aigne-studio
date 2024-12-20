import { RunOptions, RunnableResponse, RunnableResponseStream } from '@aigne/core';
import { Document, DocumentParams, IKnowledgeBase, KnowledgeBaseInfo, SearchParams } from '@aigne/core';
import { mkdir, pathExists, readFile, writeFile } from 'fs-extra';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';

import { initStore } from '../store';
import KnowledgeSegment from '../store/models/segment';
import { DocumentProcessor } from './document';
import Retriever from './retriever';

export class KnowledgeBase<I extends SearchParams, O extends Document[]> implements IKnowledgeBase<I, O> {
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

  async getInfo(): Promise<KnowledgeBaseInfo> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));
    return knowledge;
  }

  async update(info: Partial<KnowledgeBaseInfo>): Promise<KnowledgeBaseInfo> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));
    await writeFile(this.knowledgePath, stringify({ ...knowledge, ...info }));

    return { ...knowledge, ...info };
  }

  async delete(): Promise<void> {
    await writeFile(this.knowledgePath, stringify({}));
  }

  async getDocuments(params: { [key: string]: any } = {}, page: number = 1, size: number = 20) {
    const processor = await DocumentProcessor.load({
      knowledgeVectorsFolderPath: this.knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath: this.knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath: this.knowledgeProcessedFolderPath,
      knowledgePath: this.knowledgePath,
      sendToCallback: () => {},
      did: '1',
    });

    return processor.getDocuments(params, page, size);
  }

  async getDocument(documentId: string) {
    const processor = await DocumentProcessor.load({
      knowledgeVectorsFolderPath: this.knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath: this.knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath: this.knowledgeProcessedFolderPath,
      knowledgePath: this.knowledgePath,
      sendToCallback: () => {},
      did: '1',
    });

    return processor.getDocument(documentId);
  }

  async addDocuments(params: DocumentParams): Promise<O> {
    const processor = await DocumentProcessor.load({
      knowledgeVectorsFolderPath: this.knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath: this.knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath: this.knowledgeProcessedFolderPath,
      knowledgePath: this.knowledgePath,
      sendToCallback: () => {},
      did: '1',
    });

    return processor.addDocuments(params) as unknown as O;
  }

  async removeDocument(documentId: string): Promise<number> {
    const processor = await DocumentProcessor.load({
      knowledgeVectorsFolderPath: this.knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath: this.knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath: this.knowledgeProcessedFolderPath,
      knowledgePath: this.knowledgePath,
      sendToCallback: () => {},
      did: '1',
    });

    return processor.removeDocument(documentId);
  }

  async removeDocuments(documentIds: string[]): Promise<number[]> {
    return await Promise.all(documentIds.map((id) => this.removeDocument(id)));
  }

  async getSegments(documentId: string): Promise<KnowledgeSegment[]> {
    const segment = await KnowledgeSegment.findAll({
      where: {
        documentId,
      },
    });

    return segment;
  }

  async removeSegments(documentId: string): Promise<number> {
    return await KnowledgeSegment.destroy({
      where: {
        documentId,
      },
    });
  }

  async search(params: I): Promise<O> {
    const result = await this.run(params, { stream: false });
    return result;
  }

  async run(input: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(input: I, options?: RunOptions & { stream?: false }): Promise<O>;
  async run(input: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const { query, k = 5 } = input;

    const execute = async () => {
      const executor = new Retriever(this.knowledgeVectorsFolderPath, k);
      const results = await executor.search(query);
      return results as unknown as O;
    };

    if (options?.stream) {
      return new ReadableStream({
        async start(controller) {
          try {
            const result = await execute();

            for (const doc of result) {
              controller.enqueue({ delta: JSON.stringify(doc) as any });
            }

            controller.enqueue({ delta: result as O });
          } catch (error) {
            controller.error(error);
          } finally {
            controller.close();
          }
        },
      });
    }

    return execute();
  }
}
