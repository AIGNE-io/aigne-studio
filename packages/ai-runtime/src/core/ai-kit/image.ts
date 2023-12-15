import { call } from '@blocklet/sdk/lib/component';

export interface ImageGenerationInput {
  model?: 'dall-e-2' | 'dall-e-3' | null;
  prompt: string;
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792' | null;
  n?: number;
  responseFormat?: 'url' | 'b64_json' | null;
  style?: 'vivid' | 'natural' | null;
  quality?: 'standard' | 'hd';
}

export interface ImageGenerationOutput {
  data: { b64Json?: string; url?: string }[];
}

export async function callAIKitImageGeneration(input: ImageGenerationInput) {
  const response = await call<ImageGenerationOutput>({
    name: 'ai-kit',
    method: 'POST',
    path: '/api/v1/sdk/image/generations',
    data: input,
  });

  return response.data;
}
