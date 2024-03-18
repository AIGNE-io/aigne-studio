import { mkdir, rm } from 'fs/promises';
import { join } from 'path';

import { existsSync, pathExists } from 'fs-extra';
import { Embeddings } from 'langchain/dist/embeddings/base';
import { HNSWLib, HNSWLibArgs } from 'langchain/vectorstores/hnswlib';

import { Config } from '../libs/env';
import logger from '../libs/logger';

const vectorStores = new Map<string, Promise<VectorStore>>();

const vectorStorePath = (path: string) => join(Config.dataDir, 'vectors', path);

HNSWLib.imports = async () => {
  try {
    const {
      default: { HierarchicalNSW },
    } = await import('hnswlib-node');
    return { HierarchicalNSW };
  } catch (error) {
    logger.error('import HNSWLib error', { error });
    throw new Error('Please install hnswlib-node as a dependency with, e.g. `npm install -S hnswlib-node`');
  }
};

export default class VectorStore extends HNSWLib {
  constructor(
    private directory: string,
    embeddings: Embeddings,
    args: HNSWLibArgs
  ) {
    super(embeddings, args);
  }

  static override async load(path: string, embeddings: Embeddings): Promise<VectorStore> {
    const storePath = vectorStorePath(path);

    let store = vectorStores.get(storePath);
    if (!store) {
      store = (async () => {
        let hnsw: HNSWLib;

        if (await pathExists(storePath)) {
          try {
            hnsw = await HNSWLib.load(storePath, embeddings);
          } catch (error) {
            logger.error('HNSWLib load from path error', { error });
          }
        }
        await mkdir(storePath, { recursive: true });
        hnsw ??= await HNSWLib.fromDocuments([], embeddings);

        return new VectorStore(storePath, hnsw.embeddings, hnsw.args);
      })();
      vectorStores.set(storePath, store);
    }
    return store;
  }

  override async save() {
    await super.save(this.directory);
  }

  static async reset(datasetId: string): Promise<void> {
    const path = vectorStorePath(datasetId);

    if (existsSync(path)) {
      await rm(path, { recursive: true, force: true });
      logger.info(`VectorStore for datasetId ${datasetId} has been reset.`);
    } else {
      logger.info(`VectorStore for datasetId ${datasetId} does not exist, no need to reset.`);
    }

    // 确保目录被重新创建
    // mkdirSync(path, { recursive: true });

    // 从 vectorStores Map 中移除这个存储，因为它已被重置
    vectorStores.delete(path);
    await rm(path, { recursive: true, force: true });
  }
}
