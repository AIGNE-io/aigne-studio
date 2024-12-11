import { join } from 'path';

/* eslint-disable no-await-in-loop */
import { resourceManager } from '@api/libs/resource';
import { getKnowledgeVectorPath } from '@api/routes/knowledge/util';
import VectorStore from '@api/store/vector-store-faiss';
import config from '@blocklet/sdk/lib/config';
import { pathExists, readFile } from 'fs-extra';
import { uniqBy } from 'lodash';

import { AIKitEmbeddings } from '../../core/embeddings/ai-kit';
import SearchClient from '../../routes/knowledge/retriever/meilisearch';
import Knowledge from '../../store/models/dataset/dataset';
import { SEARCH_KIT_DID } from '../const';
import logger from '../logger';
import push from './push';

const getDocsList = async (vectorPath: string, embeddings: any) => {
  try {
    const docstore = join(vectorPath, 'docstore.json');
    if (await pathExists(docstore)) {
      const [docs] = JSON.parse(await readFile(docstore, 'utf-8'));
      return docs.map((i: [string, object]) => i[1]);
    }
  } catch (error) {
    logger.error(`read docstore error: ${error}`);
    const vectorStore = await VectorStore.load(vectorPath, embeddings);
    const length = Object.keys(vectorStore.getMapping())?.length;
    return length > 0 ? await vectorStore.similaritySearch(' ', length) : [];
  }

  return [];
};

const getVectorPaths = async (resources: { blockletDid: string; knowledge: Knowledge }[], knowledges: Knowledge[]) => {
  const paths: { vectorPathOrKnowledgeId: string; knowledgeId: string }[] = [];

  const checkAndAddPath = async (blockletDid: string | null, knowledge: Knowledge) => {
    const vectorPath = await getKnowledgeVectorPath(blockletDid || null, knowledge.id, knowledge);
    if (vectorPath && (await pathExists(join(vectorPath, 'faiss.index')))) {
      paths.push({ vectorPathOrKnowledgeId: vectorPath, knowledgeId: knowledge.id });
    }
  };

  await Promise.all([
    ...resources.map((r: { blockletDid: string; knowledge: Knowledge }) => checkAndAddPath(r.blockletDid, r.knowledge)),
    ...knowledges.map((k: Knowledge) => checkAndAddPath(null, k)),
  ]);

  return paths;
};

const init = async () => {
  const embeddings = new AIKitEmbeddings();
  const client = new SearchClient();
  if (client.canUse) await client.updateConfig();

  const resources = await resourceManager.getKnowledgeList();
  const knowledges = await Knowledge.findAll();

  const documents = [];
  const paths = await getVectorPaths(resources, knowledges);
  for (const path of paths) {
    const list = await getDocsList(path.vectorPathOrKnowledgeId, embeddings);
    documents.push(...client.formatDocuments(list, path.knowledgeId));
  }

  const total = uniqBy(documents, 'id').length;
  const searchTotal = (await client.getDocuments())?.total || 0;

  logger.info('vector total', total);
  logger.info('search total', searchTotal);

  if (total > searchTotal) {
    await Promise.all([
      ...resources.map((r) => push({ from: 'resource', knowledgeId: r.knowledge.id, blockletDid: r.blockletDid })), // 兼容老的搜索方式
      ...knowledges.map((k) => push({ from: 'db', knowledgeId: k.id })),
    ]);
  }
};

export default init;

config.events.on(config.Events.componentStarted, (components) => {
  if (components.find((item: { did: string }) => item.did === SEARCH_KIT_DID)) {
    init();
  }
});
