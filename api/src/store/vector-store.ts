import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

import { Embeddings } from 'langchain/dist/embeddings/base';
import { HNSWLib, HNSWLibArgs } from 'langchain/vectorstores/hnswlib';

import env from '../libs/env';
import logger from '../libs/logger';

const vectorStores = new Map<string, Promise<VectorStore>>();

const vectorStorePath = (datasetId: string) => join(env.dataDir, 'vectors', datasetId);

HNSWLib.imports = async () => {
  try {
    const {
      default: { HierarchicalNSW },
    } = await import('@blocklet/hnswlib-node');
    return { HierarchicalNSW };
  } catch (err) {
    throw new Error('Please install hnswlib-node as a dependency with, e.g. `npm install -S hnswlib-node`');
  }
};

export default class VectorStore extends HNSWLib {
  constructor(private directory: string, embeddings: Embeddings, args: HNSWLibArgs) {
    super(embeddings, args);
  }

  static override async load(datasetId: string, embeddings: Embeddings): Promise<VectorStore> {
    const path = vectorStorePath(datasetId);

    let store = vectorStores.get(path);
    if (!store) {
      store = (async () => {
        let hnsw: HNSWLib;

        if (existsSync(path)) {
          try {
            hnsw = await HNSWLib.load(path, embeddings);
          } catch (error) {
            logger.error('HNSWLib load from path error', error);
          }
        }
        mkdirSync(path, { recursive: true });
        hnsw ??= await HNSWLib.fromDocuments([], embeddings);

        return new VectorStore(path, hnsw.embeddings, hnsw.args);
      })();
      vectorStores.set(path, store);
    }
    return store;
  }

  override async save() {
    await super.save(this.directory);
  }
}
