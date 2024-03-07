import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

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

        if (existsSync(storePath)) {
          try {
            hnsw = await HNSWLib.load(storePath, embeddings);
          } catch (error) {
            logger.error('HNSWLib load from path error', { error });
          }
        }
        mkdirSync(storePath, { recursive: true });
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

  static async remove(datasetId: string) {
    vectorStores.delete(datasetId);
    const path = vectorStorePath(datasetId);
    await rmSync(path, { recursive: true, force: true });
  }
}
