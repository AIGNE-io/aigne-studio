import {
  Document,
  DocumentParams,
  IKnowledgeBase,
  KnowledgeBaseInfo,
  KnowledgeSegment,
  RunOptions,
  RunnableResponse,
  RunnableResponseStream,
  SearchParams,
} from '@aigne/core';
import { joinURL } from 'ufo';

import api from './api';

export class KnowledgeBase<I extends SearchParams, O extends Document[]> implements IKnowledgeBase<I, O> {
  constructor(private path: string) {}

  private async getResponse(result: Response) {
    if (!result.ok) {
      let message: string | undefined;

      try {
        const json = await result.json();
        const msg = json.error?.message || json.message;
        if (msg && typeof msg === 'string') {
          message = msg;
        }
      } catch {
        // ignore
      }

      throw new Error(message || `Failed to get knowledge base info with status ${result.status}`);
    }

    return await result.json();
  }

  async getInfo(): Promise<KnowledgeBaseInfo> {
    const url = joinURL('/aigne-knowledge');

    const result = await api(url);
    return this.getResponse(result);
  }

  async update(info: Partial<KnowledgeBaseInfo>): Promise<KnowledgeBaseInfo> {
    const url = joinURL('/aigne-knowledge');

    const result = await api(url, {
      method: 'PUT',
      body: JSON.stringify(info),
    });

    return this.getResponse(result);
  }

  async delete(): Promise<void> {
    const url = joinURL('/aigne-knowledge');
    const result = await api(url, { method: 'DELETE' });
    return this.getResponse(result);
  }

  async getDocuments(params: { [key: string]: any } = {}, page: number = 1, size: number = 20) {
    const url = joinURL('/aigne-knowledge/documents');
    const result = await api(url, { method: 'GET' });
    return this.getResponse(result);
  }

  async getDocument(documentId: string) {
    const url = joinURL('/aigne-knowledge/documents', documentId);
    const result = await api(url, { method: 'GET' });
    return this.getResponse(result);
  }

  async addDocuments(params: DocumentParams): Promise<O> {
    const url = joinURL('/aigne-knowledge/documents');
    const result = await api(url, { method: 'POST', body: JSON.stringify(params) });
    return this.getResponse(result);
  }

  async removeDocument(documentId: string): Promise<number> {
    const url = joinURL('/aigne-knowledge/documents', documentId);
    const result = await api(url, { method: 'DELETE' });
    return this.getResponse(result);
  }

  async removeDocuments(documentIds: string[]): Promise<number[]> {
    const url = joinURL('/aigne-knowledge/documents');
    const result = await api(url, { method: 'DELETE', body: JSON.stringify({ ids: documentIds }) });
    return this.getResponse(result);
  }

  async getSegments(documentId: string): Promise<KnowledgeSegment[]> {
    const url = joinURL('/aigne-knowledge/segments', documentId);
    const result = await api(url, { method: 'GET' });
    return this.getResponse(result);
  }

  async removeSegments(documentId: string): Promise<number> {
    const url = joinURL('/aigne-knowledge/segments', documentId);
    const result = await api(url, { method: 'DELETE' });
    return this.getResponse(result);
  }

  async search(params: I): Promise<O> {
    const url = joinURL('/aigne-knowledge/search');
    const result = await api(url, { method: 'POST', body: JSON.stringify(params) });
    return this.getResponse(result);
  }

  async run(inputs: I, options: RunOptions & { stream: true }): Promise<RunnableResponseStream<O>>;
  async run(inputs: I, options?: RunOptions & { stream?: boolean }): Promise<O>;
  async run(inputs: I, options?: RunOptions): Promise<RunnableResponse<O>> {
    const url = joinURL('/aigne-knowledge', 'run');
    const body = { options, inputs };

    const result = await api(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return this.getResponse(result);
  }
}
