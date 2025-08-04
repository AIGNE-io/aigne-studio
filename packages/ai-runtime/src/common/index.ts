import { uniqBy } from 'lodash';
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

const AIGNE_HUB_DID = 'z8ia3xzq2tMq8CRHfaXj1BTYJyYnEcHbqP8cJ';
const fetchAigneHubModels = async (type: 'chatCompletion' | 'image') => {
  const providerURL = process.env.BLOCKLET_AIGNE_API_PROVIDER || '';
  const BLOCKLET_JSON_PATH = '__blocklet__.js?type=json';

  const blockletInfo = await fetch(joinURL(providerURL, BLOCKLET_JSON_PATH));
  const blocklet = await blockletInfo.json();
  const aigneHubMount = (blocklet?.componentMountPoints || []).find((m: { did: string }) => m.did === AIGNE_HUB_DID);
  const url = withQuery(joinURL(providerURL, aigneHubMount?.mountPoint || '', '/api/ai-providers/models'), {
    type,
  });

  const response = await fetch(url);
  const data = await response.json();
  return data;
};

export async function getSupportedModels(): Promise<TextModelInfo[]> {
  const models = await fetchAigneHubModels('chatCompletion');

  const result = uniqBy(
    [
      ...models.map(
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
      ),
      {
        brand: 'OpenAI',
        model: 'gpt-4o',
        name: 'GPT4o',
        maxTokensMin: 1,
        maxTokensMax: 128000,
        maxTokensDefault: 128000,
        tags: ['OpenAI'],
      },
      {
        brand: 'OpenAI',
        model: 'gpt-4o-mini',
        name: 'GPT4o mini',
        maxTokensMin: 1,
        maxTokensMax: 128000,
        maxTokensDefault: 128000,
        tags: ['OpenAI'],
      },
      {
        brand: 'OpenAI',
        model: 'gpt-3.5-turbo',
        name: 'GPT3.5 turbo',
        maxTokensMin: 1,
        maxTokensMax: 4096,
        maxTokensDefault: 4096,
        tags: ['OpenAI'],
      },
      {
        brand: 'OpenAI',
        model: 'gpt-3.5-turbo-16k',
        name: 'GPT3.5 turbo 16k',
        maxTokensMin: 1,
        maxTokensMax: 16385,
        maxTokensDefault: 16385,
        tags: ['OpenAI'],
      },
      {
        brand: 'OpenAI',
        model: 'gpt-4',
        name: 'GPT4',
        maxTokensMin: 1,
        maxTokensMax: 8192,
        maxTokensDefault: 8192,
        tags: ['OpenAI'],
      },
      {
        brand: 'OpenAI',
        model: 'gpt-4-32k',
        name: 'GPT4 32k',
        maxTokensMin: 1,
        maxTokensMax: 32768,
        maxTokensDefault: 32768,
        tags: ['OpenAI'],
      },
      {
        brand: 'Google',
        model: 'gemini-2.5-pro',
        name: 'Gemini Pro',
        maxTokensMin: 1,
        maxTokensMax: 2048,
        maxTokensDefault: 2048,
        tags: ['Google'],
      },
      {
        brand: 'Mistral AI',
        model: 'openRouter/mistralai/mistral-7b-instruct',
        name: 'Mistral 7B Instruct',
        maxTokensMin: 1,
        maxTokensMax: 8192,
        maxTokensDefault: 8192,
        tags: ['Mistral AI'],
      },
      {
        brand: 'Mistral AI',
        model: 'openRouter/mistralai/mixtral-8x7b-instruct',
        name: 'Mixtral 8x7B Instruct (beta)',
        maxTokensMin: 1,
        maxTokensMax: 32768,
        maxTokensDefault: 32768,
        tags: ['Mistral AI'],
      },
    ],
    'model'
  ).map((model) => ({
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

  const result = uniqBy(
    [
      ...models.map(
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
          return {
            brand: x.provider,
            model: x.model,
            name: x.model,
            nMin: 1,
            nMax: x.modelMetadata?.imageGeneration?.max || 1,
            nDefault: 1,
            size: x.modelMetadata?.imageGeneration?.size || [],
            sizeDefault: x.modelMetadata?.imageGeneration?.size?.[0] || 'auto',
            style: x.modelMetadata?.imageGeneration?.style || [],
            styleDefault: x.modelMetadata?.imageGeneration?.style?.[0] || 'auto',
            quality: x.modelMetadata?.imageGeneration?.quality || [],
            qualityDefault: x.modelMetadata?.imageGeneration?.quality?.[0] || 'auto',
            tags: [x.provider],
          };
        }
      ),
      {
        brand: 'OpenAI',
        model: 'dall-e-2',
        nMin: 1,
        nMax: 10,
        nDefault: 1,
        size: ['256x256', '512x512', '1024x1024'],
        sizeDefault: '256x256',
        tags: ['OpenAI'],
      },
      {
        brand: 'OpenAI',
        model: 'dall-e-3',
        nMin: 1,
        nMax: 1,
        nDefault: 1,
        quality: ['standard', 'hd'],
        qualityDefault: 'standard',
        size: ['1024x1024', '1792x1024', '1024x1792'],
        sizeDefault: '1024x1024',
        style: ['vivid', 'natural'],
        styleDefault: 'vivid',
        tags: ['OpenAI'],
      },
      {
        brand: 'OpenAI',
        model: 'gpt-image-1',
        nMin: 1,
        nMax: 10,
        nDefault: 1,
        quality: ['high', 'medium', 'low', 'auto'],
        qualityDefault: 'auto',
        size: ['1024x1024', '1536x1024', '1024x1536', 'auto'],
        sizeDefault: 'auto',
        moderation: ['low', 'auto'],
        moderationDefault: 'auto',
        background: ['transparent', 'opaque', 'auto'],
        backgroundDefault: 'auto',
        outputFormat: ['jpeg', 'png', 'webp'],
        outputFormatDefault: 'jpeg',
        outputCompressionMin: 0,
        outputCompressionMax: 100,
        outputCompressionDefault: 100,
        tags: ['OpenAI'],
      },
    ],
    'model'
  ).map((model) => ({
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
