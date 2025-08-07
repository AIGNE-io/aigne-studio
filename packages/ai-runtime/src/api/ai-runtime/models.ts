import { call } from '@blocklet/sdk/lib/component';

import { formatSupportedImagesModels, formatSupportedModels } from '../../common/model';
import { AIGNE_RUNTIME_COMPONENT_DID } from '../../constants';
import { ImageModelInfo, TextModelInfo } from '../../types/common';

const fetchAigneHubModelsFromNode = async (type: 'chatCompletion' | 'image') => {
  const response = await call({
    name: AIGNE_RUNTIME_COMPONENT_DID,
    path: '/api/models',
    method: 'GET',
    params: { type },
  });
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
