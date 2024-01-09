export interface ModelInfoBase {
  brand: string;
  model: string;
  name?: string;
  disabled?: boolean;
}

export interface TextModelInfo extends ModelInfoBase {
  temperatureMin?: number;
  temperatureMax?: number;
  temperatureDefault?: number;
  topPMin?: number;
  topPMax?: number;
  topPDefault?: number;
  presencePenaltyMin?: number;
  presencePenaltyMax?: number;
  presencePenaltyDefault?: number;
  frequencyPenaltyMin?: number;
  frequencyPenaltyMax?: number;
  frequencyPenaltyDefault?: number;
  maxTokensMin?: number;
  maxTokensMax?: number;
  maxTokensDefault?: number;
}

export const defaultTextModel = 'gpt-3.5-turbo';

export async function getSupportedModels(): Promise<TextModelInfo[]> {
  return [
    {
      brand: 'OpenAI',
      model: 'gpt-3.5-turbo',
      name: 'GPT3.5 turbo',
      temperatureMin: 0,
      temperatureMax: 2,
      temperatureDefault: 1,
      topPMin: 0,
      topPMax: 1,
      topPDefault: 1,
      presencePenaltyMin: -2,
      presencePenaltyMax: 2,
      presencePenaltyDefault: 0,
      frequencyPenaltyMin: -2,
      frequencyPenaltyMax: 2,
      frequencyPenaltyDefault: 0,
      maxTokensMin: 1,
      maxTokensMax: 4096,
      maxTokensDefault: 4096,
    },
    {
      brand: 'OpenAI',
      model: 'gpt-3.5-turbo-16k',
      name: 'GPT3.5 turbo 16k',
      temperatureMin: 0,
      temperatureMax: 2,
      temperatureDefault: 1,
      topPMin: 0,
      topPMax: 1,
      topPDefault: 1,
      presencePenaltyMin: -2,
      presencePenaltyMax: 2,
      presencePenaltyDefault: 0,
      frequencyPenaltyMin: -2,
      frequencyPenaltyMax: 2,
      frequencyPenaltyDefault: 0,
      maxTokensMin: 1,
      maxTokensMax: 16385,
      maxTokensDefault: 16385,
    },
    {
      brand: 'OpenAI',
      model: 'gpt-4',
      name: 'GPT4',
      temperatureMin: 0,
      temperatureMax: 2,
      temperatureDefault: 1,
      topPMin: 0,
      topPMax: 1,
      topPDefault: 1,
      presencePenaltyMin: -2,
      presencePenaltyMax: 2,
      presencePenaltyDefault: 0,
      frequencyPenaltyMin: -2,
      frequencyPenaltyMax: 2,
      frequencyPenaltyDefault: 0,
      maxTokensMin: 1,
      maxTokensMax: 8192,
      maxTokensDefault: 8192,
    },
    {
      brand: 'OpenAI',
      model: 'gpt-4-32k',
      name: 'GPT4 32k',
      temperatureMin: 0,
      temperatureMax: 2,
      temperatureDefault: 1,
      topPMin: 0,
      topPMax: 1,
      topPDefault: 1,
      presencePenaltyMin: -2,
      presencePenaltyMax: 2,
      presencePenaltyDefault: 0,
      frequencyPenaltyMin: -2,
      frequencyPenaltyMax: 2,
      frequencyPenaltyDefault: 0,
      maxTokensMin: 1,
      maxTokensMax: 32768,
      maxTokensDefault: 32768,
    },
    {
      brand: 'Google',
      model: 'gemini-pro',
      name: 'Gemini Pro',
      temperatureMin: 0,
      temperatureMax: 2,
      temperatureDefault: 1,
      topPMin: 0.1,
      topPMax: 1,
      topPDefault: 1,
      maxTokensMin: 1,
      maxTokensMax: 2048,
      maxTokensDefault: 2048,
    },
    {
      brand: 'Mistral AI',
      model: 'openRouter/mistralai/mistral-7b-instruct',
      name: 'Mistral 7B Instruct',
      temperatureMin: 0,
      temperatureMax: 2,
      temperatureDefault: 1,
      topPMin: 0,
      topPMax: 1,
      topPDefault: 1,
      maxTokensMin: 1,
      maxTokensMax: 8192,
      maxTokensDefault: 8192,
    },
    {
      brand: 'Mistral AI',
      model: 'openRouter/mistralai/mixtral-8x7b-instruct',
      name: 'Mixtral 8x7B Instruct (beta)',
      temperatureMin: 0,
      temperatureMax: 2,
      temperatureDefault: 1,
      topPMin: 0,
      topPMax: 1,
      topPDefault: 1,
      maxTokensMin: 1,
      maxTokensMax: 32768,
      maxTokensDefault: 32768,
    },
    {
      brand: 'Hugging Face',
      model: 'Hugging Face',
      disabled: true,
    },
    {
      brand: 'Azure OpenAI',
      model: 'Azure OpenAI',
      disabled: true,
    },
    {
      brand: 'Replicate',
      model: 'Replicate',
      disabled: true,
    },
    {
      brand: 'Vertex AI',
      model: 'Vertex AI',
      disabled: true,
    },
  ];
}

export interface ImageModelInfo extends ModelInfoBase {
  brand: string;
  model: string;
  nMin?: number;
  nMax?: number;
  nDefault?: number;
  disabled?: boolean;
  quality?: string[];
  qualityDefault?: string;
  size?: string[];
  sizeDefault?: string;
  style?: string[];
  styleDefault?: string;
}

export const defaultImageModel = 'dall-e-2';

export async function getSupportedImagesModels(): Promise<ImageModelInfo[]> {
  return [
    {
      brand: 'OpenAI',
      model: 'dall-e-2',
      nMin: 1,
      nMax: 10,
      nDefault: 1,
      size: ['256x256', '512x512', '1024x1024'],
      sizeDefault: '256x256',
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
    },
  ];
}
