import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { Document } from '@langchain/core/documents';
import { MarkdownTextSplitter, RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { intersection } from 'lodash';

import Segment from '../store/models/segment';
import VectorStore from '../store/vector-store-faiss';
import { discussionToMarkdown } from './discuss';
import { AIKitEmbeddings } from './embeddings/ai-kit';

const deleteStore = async (storePath: string, ids: string[]) => {
  const embeddings = new AIKitEmbeddings();
  const store = await VectorStore.load(storePath, embeddings);

  const remoteIds = Object.values(store.getMapping()) || [];
  const deleteIds = intersection(remoteIds, ids);

  // 直接删除既可以，但这样更严谨
  if (deleteIds.length) {
    await store.delete({ ids: deleteIds });
    await store.save();
  }
};

function formatDocument(doc: Document, metadata?: Record<string, unknown>): Document {
  if (metadata && Object.keys(metadata).length) {
    return { ...doc, pageContent: JSON.stringify({ content: doc.pageContent, metadata }) };
  }

  return doc;
}

async function processContent(
  content: string,
  type: 'file' | 'text' | 'discussKit' | 'url',
  metadata?: Record<string, unknown>,
  config?: { separators: string[]; chunkSize: number; chunkOverlap: number }
) {
  if (!content || typeof content !== 'string') {
    throw new Error(`Invalid content: ${typeof content}`);
  }

  let docs: Document[] = [];
  const { chunkSize, chunkOverlap } = config || {};

  if (type === 'discussKit') {
    try {
      const json = JSON.parse(content);
      const markdown = discussionToMarkdown(json, metadata?.link as string);
      const splitter = new MarkdownTextSplitter({ chunkSize, chunkOverlap });
      const chunks = await splitter.splitText(markdown);
      const metadataArray = metadata ? Array(chunks.length).fill({ metadata }) : undefined;
      docs = await splitter.createDocuments(chunks, metadataArray);
    } catch (error) {
      const splitter = new RecursiveCharacterTextSplitter(config);
      const chunks = await splitter.splitText(content);
      const metadataArray = metadata ? Array(chunks.length).fill({ metadata }) : undefined;
      docs = await splitter.createDocuments(chunks, metadataArray);
    }
  } else {
    const splitter = new RecursiveCharacterTextSplitter(config);
    const chunks = await splitter.splitText(content);
    const metadataArray = metadata ? Array(chunks.length).fill({ metadata }) : undefined;
    docs = await splitter.createDocuments(chunks, metadataArray);
  }

  const formattedDocs = docs.map((doc) => formatDocument(doc, metadata));
  return formattedDocs;
}

async function updateVectorStore(storePath: string, vectors: number[][], docs: Document[], ids: string[]) {
  const embeddings = new AIKitEmbeddings();
  const store = await VectorStore.load(storePath, embeddings);
  await store.addVectors(vectors, docs, { ids });
  await store.save();
}

export const getFormattedDocs = async ({
  content,
  metadata,
  type,
}: {
  content: string;
  metadata?: Record<string, unknown>;
  type: 'file' | 'text' | 'discussKit' | 'url';
}) => {
  const formattedDocs = await processContent(content, type, metadata, {
    separators: ['\n\n', '\n', ' ', ''],
    chunkSize: 1024,
    chunkOverlap: 100,
  });

  return formattedDocs;
};

const getFormattedDocsVectors = async ({ formattedDocs }: { formattedDocs: Document[] }) => {
  const embeddings = new AIKitEmbeddings();
  const vectors = await embeddings.embedDocuments(formattedDocs.map((d) => d.pageContent));
  return vectors;
};

const getFormattedDocsSegments = async ({
  formattedDocs,
  documentId,
}: {
  formattedDocs: Document[];
  documentId: string;
}) => {
  const segments = await Promise.all(
    formattedDocs.map((doc) => (doc.pageContent ? Segment.create({ documentId, content: doc.pageContent }) : null))
  );

  return segments.filter(isNonNullable).map((segment) => segment.id);
};

export const addDocumentsToVectorStore = async ({
  storePath,
  formattedDocs,
  documentId,
}: {
  storePath: string;
  formattedDocs: Document[];
  documentId: string;
}) => {
  const vectors = await getFormattedDocsVectors({ formattedDocs });
  const segments = await getFormattedDocsSegments({ formattedDocs, documentId });
  await updateVectorStore(storePath, vectors, formattedDocs, segments);
};

export const removeDocumentsFromVectorStore = async (storePath: string, documentId: string) => {
  const where = { documentId };
  const { rows: messages, count } = await Segment.findAndCountAll({ where });

  if (count > 0) {
    const ids = messages.map((x) => x.id);
    await deleteStore(storePath, ids);
    await Segment.destroy({ where });
  }
};
