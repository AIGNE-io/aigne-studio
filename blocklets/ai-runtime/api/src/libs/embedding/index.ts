import { resourceManager } from '@api/libs/resource';
import config from '@blocklet/sdk/lib/config';

import { embeddingSearchKitQueue } from '../../routes/knowledge/util/queue';
import Knowledge from '../../store/models/dataset/dataset';
import { SEARCH_KIT_DID } from '../const';

const init = async () => {
  const resources = await resourceManager.getKnowledgeList();

  // 兼容老的搜索方式
  for (const resource of resources) {
    embeddingSearchKitQueue.push({
      type: 'embedding-search-kit',
      from: 'resource',
      knowledgeId: resource.knowledge.id,
      blockletDid: resource.blockletDid,
    });
  }

  const knowledges = await Knowledge.findAll();
  for (const knowledge of knowledges) {
    embeddingSearchKitQueue.push({
      type: 'embedding-search-kit',
      from: 'db',
      knowledgeId: knowledge.id,
    });
  }
};

export default init;

config.events.on(config.Events.componentStarted, (components) => {
  if (components.find((item: { did: string }) => item.did === SEARCH_KIT_DID)) {
    init();
  }
});
