import { join } from 'path';

/* eslint-disable no-await-in-loop */
import { resourceManager } from '@api/libs/resource';
import { getKnowledgeVectorPath } from '@api/routes/knowledge/util';
import VectorStore from '@api/store/vector-store-faiss';
import { BlockletStatus } from '@blocklet/constant';
import config, { components } from '@blocklet/sdk/lib/config';
import { Document } from '@langchain/core/documents';
import { pathExists, readFile } from 'fs-extra';
import { orderBy, uniqBy } from 'lodash';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import SearchClient from '../../routes/knowledge/retriever/meilisearch/meilisearch';
import Knowledge from '../../store/models/dataset/dataset';
import { SEARCH_KIT_DID } from '../const';
import logger from '../logger';
import push, { PushParams } from './push';

const getDocsList = async (vectorPath: string, embeddings: any): Promise<Document[]> => {
  const docstore = join(vectorPath, 'docstore.json');
  try {
    if (await pathExists(docstore)) {
      const content = await readFile(docstore, 'utf-8');
      const [docs] = content ? JSON.parse(content) : [[]];
      return docs.map((i: [string, object]) => i[1]).filter(Boolean);
    }
  } catch (error) {
    logger.error(`read docstore error: ${error}`, docstore);
    const vectorStore = await VectorStore.load(vectorPath, embeddings);
    const length = Object.keys(vectorStore.getMapping())?.length;
    return length > 0 ? ((await vectorStore.similaritySearch(' ', length)) as unknown as Document[]) : [];
  }

  return [];
};

const getVectorPaths = async (resources: { blockletDid: string; knowledge: Knowledge }[], knowledges: Knowledge[]) => {
  const paths: { vectorPathOrKnowledgeId: string; knowledgeId: string; params: PushParams }[] = [];

  const checkAndAddPath = async (blockletDid: string | null, knowledge: Knowledge, params: PushParams) => {
    const vectorPath = await getKnowledgeVectorPath(blockletDid || null, knowledge.id, knowledge);

    if (vectorPath && (await pathExists(join(vectorPath, 'faiss.index')))) {
      paths.push({ vectorPathOrKnowledgeId: vectorPath, knowledgeId: knowledge.id, params });
    }
  };

  await Promise.all([
    ...resources.map((r: { blockletDid: string; knowledge: Knowledge }) =>
      checkAndAddPath(r.blockletDid, r.knowledge, {
        from: 'resource',
        knowledgeId: r.knowledge.id,
        blockletDid: r.blockletDid,
      })
    ),
    ...knowledges.map((k: Knowledge) => checkAndAddPath(null, k, { from: 'db', knowledgeId: k.id })),
  ]);

  return paths;
};

const init = async () => {
  try {
    const embeddings = new AIKitEmbeddings();

    const resources = await resourceManager.getKnowledgeList();
    const knowledges = await Knowledge.findAll();

    const paths = await getVectorPaths(resources, knowledges);

    const component = components.find((item: { did: string }) => item.did === SEARCH_KIT_DID);
    if (!component || component.status !== BlockletStatus.running) return;

    for (const path of paths) {
      const list = await getDocsList(path.vectorPathOrKnowledgeId, embeddings);
      const client = new SearchClient(path.knowledgeId);
      if (client.canUse) client.updateConfig();

      const documents = client.formatDocuments(list);
      const total = uniqBy(documents, 'id').length;
      const searchTotal = (await client.getDocuments())?.total || 0;

      logger.info('compare knowledge embedding total', {
        total,
        searchTotal,
        knowledgeId: path.knowledgeId,
        isNeedEmbedding: total > searchTotal,
      });

      if (total > searchTotal) await push(path.params);
    }
  } catch (error) {
    logger.error('init embedding error', error);
  }
};

export default init;

export const getEmbeddingsStatus = async () => {
  const embeddings = new AIKitEmbeddings();

  const resources = await resourceManager.getKnowledgeList();
  const knowledges = await Knowledge.findAll();

  const paths = await getVectorPaths(resources, knowledges);

  const result = await Promise.all(
    paths.map(async (path) => {
      const list = await getDocsList(path.vectorPathOrKnowledgeId, embeddings);
      const client = new SearchClient(path.knowledgeId);

      const documents = client.formatDocuments(list);
      const total = uniqBy(documents, 'id').length;
      const searchTotal = (await client.getDocuments())?.total || 0;

      return {
        total,
        searchTotal,
        knowledgeId: path.knowledgeId,
        isNeedEmbedding: total > searchTotal,
        queuedTasks: await client.getTasks(),
        vectorPathOrKnowledgeId: path.vectorPathOrKnowledgeId,
        error: await client.updateConfig().catch((err) => err),
      };
    })
  );

  return orderBy(result, ['isNeedEmbedding'], ['desc']);
};

config.events.on(config.Events.componentStarted, (components) => {
  if (components.find((item: { did: string }) => item.did === SEARCH_KIT_DID)) {
    init();
  }
});
