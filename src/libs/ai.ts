import axios from './api';

export async function getAIStatus(): Promise<{ available: boolean }> {
  return axios.get('/api/ai/status').then((res) => res.data);
}

export interface AIResponse {
  id: string;
  model: string;
  object: string;
  created: number;
  choices: { finish_reason: string; index: number; text: string }[];
  usage: {
    completion_tokens: number;
    prompt_tokens: number;
    total_tokens: number;
  };
}

export async function completions(options: { prompt: string; stream: true }): Promise<ReadableStream>;
export async function completions(options: { prompt: string; stream?: boolean }): Promise<AIResponse>;
export async function completions(options: { prompt: string; stream?: boolean }): Promise<AIResponse | ReadableStream> {
  const url = '/api/ai/completions';
  if (options.stream) {
    return fetch(axios.getUri({ url }), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    }).then(async (res) => {
      if (res.status >= 200 && res.status < 300) {
        return res.body!;
      }
      const text = await res.text();
      throw new Error(text);
    });
  }
  return axios.post(url, options).then((res) => res.data);
}

export interface AIImageResponse {
  created: number;
  data: { url: string }[];
}

export type ImageGenerationSize = '256x256' | '512x512' | '1024x1024';

export async function imageGenerations(options: {
  prompt: string;
  size: ImageGenerationSize;
  n: number;
  response_format?: string;
}): Promise<AIImageResponse> {
  // client side default is b64_json, so that we can download image
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { response_format = 'b64_json' } = options;
  return axios
    .post('/api/ai/image/generations', {
      ...options,
      response_format,
    })
    .then((res) => {
      if (response_format === 'b64_json') {
        try {
          res.data.data = res.data.data.map((item: any) => {
            return {
              url: `data:image/png;base64,${item.b64_json}`,
            };
          });
        } catch (error) {
          console.error('format b64_json error: ', error);
        }
      }
      return res.data;
    });
}
