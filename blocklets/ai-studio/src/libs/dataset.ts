import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import flattenApiStructure from '@blocklet/dataset-sdk/util/flatten-open-api';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { joinURL } from 'ufo';

import Knowledge from '../../api/src/store/models/dataset/dataset';
import KnowledgeDocument from '../../api/src/store/models/dataset/document';
import KnowledgeSegment from '../../api/src/store/models/dataset/segment';
import axios from './api';
import { AIGNE_RUNTIME_MOUNT_POINT } from './constants';

export interface CreateDiscussionItem {
  name: string;
  data: {
    id: string;
    title: string;
    type?: 'discussion' | 'blog' | 'doc';
    from: 'discussion' | 'board' | 'discussionType';
    boardId?: string;
  };
}

export type CreateDiscussionItemInput = CreateDiscussionItem | CreateDiscussionItem[];

export type KnowledgeCard = Knowledge & {
  user: { did: string; fullName: string; avatar: string };
  totalSize: number;
  docs: number;
  blockletDid?: string;
  installed?: boolean;
};

export type KnowledgeDocumentCard = KnowledgeDocument & {};

export interface KnowledgeInput {
  name?: string;
  description?: string;
  projectId?: string;
  resourceBlockletDid?: string;
  knowledgeId?: string;
  icon?: string;
}

export async function searchKnowledge({
  knowledgeId,
  message,
}: {
  knowledgeId: string;
  message: string;
}): Promise<{ docs: { content: any; metadata: any }[] }> {
  return axios
    .get(`/api/datasets/${knowledgeId}/search`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: { message } })
    .then((res) => res.data);
}

export async function getAPIList(): Promise<DatasetObject[]> {
  return axios
    .get('/.well-known/service/openapi.json', { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => flattenApiStructure(res.data))
    .catch(() => []);
}

export async function getKnowledgeList({
  projectId,
  page,
  size,
}: {
  projectId?: string;
  page?: number;
  size?: number;
}): Promise<KnowledgeCard[]> {
  return axios
    .get('/api/datasets', { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params: { projectId, page, size } })
    .then((res) => res.data);
}

export async function getResourcesKnowledgeList(): Promise<KnowledgeCard[]> {
  return axios.get('/api/datasets/resources', { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function getKnowledge(knowledgeId: string): Promise<KnowledgeCard> {
  return axios.get(`/api/datasets/${knowledgeId}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function createKnowledge(input?: KnowledgeInput): Promise<KnowledgeCard> {
  await axios.get('/api/broadcast').then((res) => res.data);
  throw new Error('Not implemented');
}

export async function createDatasetFromResources(input: { items: KnowledgeInput[] }): Promise<Knowledge[]> {
  return axios
    .post('/api/datasets/import-resources', input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function updateKnowledge(knowledgeId: string, input: KnowledgeInput): Promise<Knowledge> {
  return axios
    .put(`/api/datasets/${knowledgeId}`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function deleteKnowledge(knowledgeId: string): Promise<any> {
  return axios.delete(`/api/datasets/${knowledgeId}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT }).then((res) => res.data);
}

export async function createFileDocument(
  knowledgeId: string,
  input: { filename: string; name: string; size: number }
): Promise<KnowledgeDocument> {
  return axios
    .post(`/api/datasets/${knowledgeId}/documents/file`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function createCustomDocument(
  knowledgeId: string,
  input: { title: string; content: string }
): Promise<KnowledgeDocument> {
  return axios
    .post(`/api/datasets/${knowledgeId}/documents/custom`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function createDiscussionDocument(
  knowledgeId: string,
  input: CreateDiscussionItem[]
): Promise<KnowledgeDocument> {
  return axios
    .post(`/api/datasets/${knowledgeId}/documents/discussion`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function createCrawlDocument(
  knowledgeId: string,
  input: { provider: 'jina' | 'firecrawl'; apiKey?: string; url?: string }
): Promise<KnowledgeDocument> {
  return axios
    .post(`/api/datasets/${knowledgeId}/documents/url`, input, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function getDocuments(
  knowledgeId: string,
  params: { blockletDid?: string; page?: number; size?: number }
): Promise<{ items: KnowledgeDocumentCard[]; total: number; page: number }> {
  return axios
    .get(`/api/datasets/${knowledgeId}/documents`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT, params })
    .then((res) => res.data);
}

export async function getDocument(
  knowledgeId: string,
  documentId: string
): Promise<{ dataset: Knowledge; document: KnowledgeDocument }> {
  return axios
    .get(`/api/datasets/${knowledgeId}/documents/${documentId}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function getDocumentContent(knowledgeId: string, documentId: string): Promise<{ content: string }> {
  return axios
    .get(`/api/datasets/${knowledgeId}/documents/${documentId}/content`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function deleteDocument(
  knowledgeId: string,
  documentId: string
): Promise<{ dataset: Knowledge; document: KnowledgeDocument }> {
  return axios
    .delete(`/api/datasets/${knowledgeId}/documents/${documentId}`, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function refreshEmbedding(knowledgeId: string, documentId: string): Promise<{ data: string }> {
  return axios
    .post(`/api/datasets/${knowledgeId}/documents/${documentId}/embedding`, {}, { baseURL: AIGNE_RUNTIME_MOUNT_POINT })
    .then((res) => res.data);
}

export async function getSegments(
  knowledgeId: string,
  documentId: string,
  params: { page?: number; size?: number } = {}
): Promise<{ items: KnowledgeSegment[]; total: number; page: number }> {
  return axios
    .get(`/api/datasets/${knowledgeId}/documents/${documentId}/segments`, {
      baseURL: AIGNE_RUNTIME_MOUNT_POINT,
      params,
    })
    .then((res) => res.data);
}

export async function watchKnowledgeEmbeddings({
  knowledgeId,
  signal,
}: {
  knowledgeId: string;
  signal?: AbortSignal | null;
}) {
  const url = joinURL(window.location.origin, AIGNE_RUNTIME_MOUNT_POINT, `/api/datasets/${knowledgeId}/embeddings`);

  return new ReadableStream<
    | { type: 'change'; documentId: string; embeddingStatus: string; embeddingEndAt?: Date; embeddingStartAt?: Date }
    | { type: 'complete'; documentId: string; embeddingStatus: string; embeddingEndAt?: Date; embeddingStartAt?: Date }
    | { type: 'error'; documentId: string; embeddingStatus: string; error: string }
  >({
    async start(controller) {
      await fetchEventSource(url, {
        signal,
        method: 'GET',
        onmessage(e) {
          const data = JSON.parse(e.data);
          controller.enqueue({ ...data, type: e.event });
        },
        onerror(err) {
          throw err;
        },
        onclose() {
          controller.close();
        },
      });
    },
  });
}
