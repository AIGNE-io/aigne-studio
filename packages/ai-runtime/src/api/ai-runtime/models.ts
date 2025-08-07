import { call } from '@blocklet/sdk/lib/component';
import { LRUCache } from 'lru-cache';

import { formatSupportedImagesModels, formatSupportedModels } from '../../common/model';
import { AIGNE_RUNTIME_COMPONENT_DID } from '../../constants';
import { ImageModelInfo, TextModelInfo } from '../../types/common';

const cache = new LRUCache<string, any>({ max: 100, ttl: 1000 * 60 * 5 });

const fetchAigneHubModelsFromNode = async (type: 'chatCompletion' | 'image') => {
  if (cache.get(type)) {
    return cache.get(type);
  }

  const response = await call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    path: '/api/models',
    method: 'GET',
    params: { type },
  });

  if (response.data?.length) {
    cache.set(type, response.data);
  }

  return response.data;
};

export async function getSupportedModels(): Promise<TextModelInfo[]> {
  const models = await fetchAigneHubModelsFromNode('chatCompletion');
  return formatSupportedModels(models);
}

export async function getSupportedImagesModels(): Promise<ImageModelInfo[]> {
  const models = await fetchAigneHubModelsFromNode('image');
  return formatSupportedImagesModels(models);
}
