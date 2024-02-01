export interface ModelInfoBase {
  brand: string;
  model: string;
  name?: string;
  disabled?: boolean;
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
  responseFormat?: string[];
  responseFormatDefault?: string;
  size?: string[];
  sizeDefault?: string;
  style?: string[];
  styleDefault?: string;
}

export const defaultImageModel = 'dall-e-2';

export function getSupportedImagesModels(): ImageModelInfo[] {
  return [
    {
      brand: 'OpenAI',
      model: 'dall-e-2',
      nMin: 1,
      nMax: 10,
      nDefault: 1,
      responseFormat: ['url', 'b64_json'],
      responseFormatDefault: 'url',
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
      responseFormat: ['url', 'b64_json'],
      responseFormatDefault: 'url',
      size: ['1024x1024', '1792x1024', '1024x1792'],
      sizeDefault: '1024x1024',
      style: ['vivid', 'natural'],
      styleDefault: 'vivid',
    },
  ];
}
