import { LRUCache } from 'lru-cache';
import { joinURL, withQuery } from 'ufo';

import { ImageModelInfo, ServiceMode, ServiceModePermissionMap, TextModelInfo } from '../types/common';

export const defaultTextModel = 'gpt-4o-mini';

const textModelParamsDefault = {
  temperatureMin: 0,
  temperatureMax: 2,
  topPMin: 0,
  topPMax: 1,
  topPDefault: 1,
  presencePenaltyMin: -2,
  presencePenaltyMax: 2,
  presencePenaltyDefault: 0,
  frequencyPenaltyMin: -2,
  frequencyPenaltyMax: 2,
  frequencyPenaltyDefault: 0,
};

const lru = new LRUCache({ max: 500, ttl: 5 * 60e3 });
const AIGNE_HUB_DID = 'z8ia3xzq2tMq8CRHfaXj1BTYJyYnEcHbqP8cJ';
const AIGNE_RUNTIME_DID = 'z2qaBP9SahqU2L2YA3ip7NecwKACMByTFuiJ2';

const fetchAigneHubModelsFromWindow = async (type: 'chatCompletion' | 'image') => {
  const f = (blocklet?.componentMountPoints || []).find((m: { did: string }) => m.did === AIGNE_RUNTIME_DID);
  const url = withQuery(joinURL(window.location.origin, f?.mountPoint || '', '/api/models'), { type });

  const key = `${new URL(url).origin}-${type}`;
  const cached = lru.get(key);
  if (cached) {
    return cached;
  }

  const response = await fetch(url);
  const data = await response.json();
  lru.set(key, data);
  return data;
};

const fetchAigneHubModelsFromNode = async (type: 'chatCompletion' | 'image') => {
  const apiURL = process.env.BLOCKLET_AIGNE_API_URL || '';
  if (!process.env.BLOCKLET_AIGNE_API_URL) {
    throw new Error('Please connect aigne hub first');
  }

  const BLOCKLET_JSON_PATH = '__blocklet__.js?type=json';
  const blockletURL = joinURL(apiURL, BLOCKLET_JSON_PATH);

  const key = `${new URL(blockletURL).origin}-${type}`;
  const cached = lru.get(key);
  if (cached) {
    return cached;
  }

  const blockletInfo = await fetch(blockletURL);
  const blocklet = await blockletInfo.json();
  const aigneHubMount = (blocklet?.componentMountPoints || []).find((m: { did: string }) => m.did === AIGNE_HUB_DID);
  const url = withQuery(joinURL(apiURL, aigneHubMount?.mountPoint || '', '/api/ai-providers/models'), { type });

  const response = await fetch(url);
  const data = await response.json();
  lru.set(key, data);
  return data;
};

const fetchAigneHubModels = async (type: 'chatCompletion' | 'image') => {
  // 前端调用
  if (typeof window !== 'undefined' && window?.blocklet) {
    return fetchAigneHubModelsFromWindow(type);
  }

  return fetchAigneHubModelsFromNode(type);
};

export async function getSupportedModels(): Promise<TextModelInfo[]> {
  const models = await fetchAigneHubModels('chatCompletion');
  const formatModels: TextModelInfo[] = models.map(
    (x: {
      key: string;
      model: string;
      type: string;
      provider: string;
      input_credits_per_token: number;
      output_credits_per_token: number;
      modelMetadata: any;
    }) => {
      const brand = x.provider === 'openai' ? 'OpenAI' : x.provider;

      return {
        brand,
        model: x.model,
        name: x.model,
        maxTokensMin: 1,
        maxTokensMax: x.modelMetadata?.maxTokens,
        maxTokensDefault: x.modelMetadata?.maxTokens,
        tags: [brand],
      };
    }
  );

  const result = formatModels.map((model) => ({
    ...model,
    ...textModelParamsDefault,
  }));

  return result;
}

export const defaultImageModel = 'dall-e-2';

const imageModelParamsDefault = {
  nDefault: 1,
};

export async function getSupportedImagesModels(): Promise<ImageModelInfo[]> {
  const models = await fetchAigneHubModels('image');
  const formatModels: ImageModelInfo[] = models.map(
    (x: {
      key: string;
      model: string;
      type: string;
      provider: string;
      input_credits_per_token: number;
      output_credits_per_token: number;
      modelMetadata: {
        imageGeneration?: {
          max?: number;
          quality?: string[];
          size?: string[];
          style?: string[];
        };
      };
    }) => {
      const brand = x.provider === 'openai' ? 'OpenAI' : x.provider;

      return {
        brand,
        model: x.model,
        name: x.model,
        nMin: 1,
        nMax: x.modelMetadata?.imageGeneration?.max || 1,
        nDefault: 1,
        size: x.modelMetadata?.imageGeneration?.size || [],
        sizeDefault: x.modelMetadata?.imageGeneration?.size?.[0] || 'auto',
        style: x.modelMetadata?.imageGeneration?.style || [],
        styleDefault: x.modelMetadata?.imageGeneration?.style?.[0] || 'vivid',
        quality: x.modelMetadata?.imageGeneration?.quality || [],
        qualityDefault: x.modelMetadata?.imageGeneration?.quality?.[0] || 'standard',
        tags: [brand],
      };
    }
  );

  const result = formatModels.map((model) => ({
    ...model,
    ...imageModelParamsDefault,
  }));

  return result;
}

export async function getModelBrand(model: string) {
  const modelsArray = await Promise.all([getSupportedModels(), getSupportedImagesModels()]);
  return modelsArray.flat().find((m) => m.model === model)?.brand || null;
}

export function getServiceModePermissionMap(serviceMode: ServiceMode): ServiceModePermissionMap {
  const permissionMap = {
    single: {
      ensureViewAllProjectsRoles: ['owner', 'admin', 'promptsEditor'],
      ensurePromptsEditorRoles: ['owner', 'admin', 'promptsEditor'],
      ensurePromptsAdminRoles: ['owner', 'admin', 'promptsEditor'],
    },
    multiple: {
      ensureViewAllProjectsRoles: [],
      // no need to check, everyone can do it, will check author permission in the backend
      ensurePromptsEditorRoles: undefined,
      ensurePromptsAdminRoles: ['owner', 'admin', 'promptsEditor'],
    },
  };

  // try to fallback to 'single-tenant'
  return permissionMap[serviceMode] || permissionMap.single;
}
