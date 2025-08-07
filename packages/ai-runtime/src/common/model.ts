import sortBy from 'lodash/sortBy';

import { ImageModelInfo, TextModelInfo } from '../types/common';

type TextModel = {
  key: string;
  model: string;
  type: string;
  provider: string;
  input_credits_per_token: number;
  output_credits_per_token: number;
  modelMetadata: any;
};

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

export async function formatSupportedModels(models: TextModel[]): Promise<TextModelInfo[]> {
  const formatModels: TextModelInfo[] = models.map((x) => {
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
  });

  const result = sortBy(
    formatModels.map((model) => ({
      ...model,
      ...textModelParamsDefault,
    })),
    (key) => !key.brand.toLocaleLowerCase().includes('openai')
  );

  return result;
}

type ImageModel = {
  key: string;
  model: string;
  type: string;
  provider: string;
  input_credits_per_token: number;
  output_credits_per_token: number;
  modelMetadata: {
    imageGeneration?: {
      max?: number;
      quality?: ('standard' | 'hd' | 'high' | 'medium' | 'low' | 'auto')[];
      size?: ('256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024' | '1536x1024' | '1024x1536' | 'auto')[];
      style?: ('vivid' | 'natural')[];
    };
  };
};

const imageModelParamsDefault = {
  nDefault: 1,
};

export async function formatSupportedImagesModels(models: ImageModel[]): Promise<ImageModelInfo[]> {
  const formatModels: ImageModelInfo[] = models.map((x) => {
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
  });

  const result = formatModels.map((model) => ({
    ...model,
    ...imageModelParamsDefault,
  }));

  return result;
}
