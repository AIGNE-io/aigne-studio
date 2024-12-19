/* eslint-disable no-await-in-loop */
import { hash } from 'crypto';
import { stat, writeFile } from 'fs/promises';
import { join } from 'path';

import { Document } from '@langchain/core/documents';
import { exists, readFile } from 'fs-extra';
import { parse } from 'yaml';

import { getFormattedDocs } from '../../libs/vector-store';
import logger from '../../logger';
import KnowledgeDocument from '../../store/models/document';
import EmbeddingHistories from '../../store/models/embedding-history';

export enum UploadStatus {
  Idle = 'idle',
  Uploading = 'uploading',
  Success = 'success',
  Error = 'error',
}

export abstract class BaseProcessor {
  protected knowledgeVectorsFolderPath: string = '';
  protected knowledgeSourcesFolderPath: string = '';
  protected knowledgeProcessedFolderPath: string = '';
  protected knowledgePath: string = '';
  protected did: string = '';
  protected documentId: string = '';
  protected sendToRelay: (...args: any[]) => void = () => {};
  constructor({
    knowledgePath,
    knowledgeVectorsFolderPath,
    knowledgeSourcesFolderPath,
    knowledgeProcessedFolderPath,
    did,
    sendToRelay,
  }: {
    knowledgePath: string;
    knowledgeVectorsFolderPath: string;
    knowledgeSourcesFolderPath: string;
    knowledgeProcessedFolderPath: string;
    did: string;
    sendToRelay: (...args: any[]) => void;
  }) {
    this.knowledgePath = knowledgePath;
    this.knowledgeVectorsFolderPath = knowledgeVectorsFolderPath;
    this.knowledgeSourcesFolderPath = knowledgeSourcesFolderPath;
    this.knowledgeProcessedFolderPath = knowledgeProcessedFolderPath;
    this.did = did;
    this.sendToRelay = sendToRelay;
  }

  protected async saveProcessedFile(content: string): Promise<void> {
    const processedFilePath = join(this.knowledgeProcessedFolderPath, `${this.documentId}.yml`);
    await writeFile(processedFilePath, content);
    await KnowledgeDocument.update({ size: (await stat(processedFilePath)).size }, { where: { id: this.documentId } });
  }

  private async send({ ...props }: any, type: 'error' | 'complete' | 'change') {
    const document = await this.getDocument();
    const result = await document.update({ ...props });

    this.sendToRelay({
      eventType: type,
      documentId: this.documentId,
      ...result.dataValues,
    });

    return result.dataValues;
  }

  async load(): Promise<{ id: string; documents: Document[] }> {
    try {
      await this.send({ embeddingStatus: UploadStatus.Uploading, embeddingStartAt: new Date() }, 'change');

      logger.debug('save original file');
      await this.saveOriginSource();

      const document = await this.getDocument();
      if (!document.filename) {
        throw new Error('get processed file path failed');
      }

      logger.debug('processed file');
      const content = await this.ProcessedFile();
      logger.debug('save processed file');
      await this.saveProcessedFile(content);
      logger.debug('start RAG');
      const documents = await this.startRAG();
      logger.debug('send complete');
      await this.send({ embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date(), error: null }, 'complete');
      return { id: this.documentId, documents };
    } catch (error) {
      const message = (error as Error)?.message;
      logger.error('execute embedding pipeline error', message);
      throw error;
    }
  }

  async getDocument(): Promise<KnowledgeDocument> {
    const document = await KnowledgeDocument.findOne({ where: { id: this.documentId } });
    if (!document) throw new Error(`document ${this.documentId} not found`);
    return document;
  }

  preprocessText(text: string): string {
    return text.trim();
  }

  protected abstract saveOriginSource(): Promise<void>;

  protected abstract ProcessedFile(): Promise<string>;

  protected abstract init(): Promise<void>;

  protected async startRAG(): Promise<Document[]> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));
    const knowledgeId = knowledge.id;

    const processedFilePath = join(this.knowledgeProcessedFolderPath, `${this.documentId}.yml`);
    if (!(await exists(processedFilePath))) throw new Error(`processedFilePath ${processedFilePath} not found`);

    const fileContent = (await readFile(processedFilePath)).toString();
    const document = await this.getDocument();

    const contents = parse(fileContent);
    const array = Array.isArray(contents) ? contents : [contents];

    const currentTotal = array.length;
    let currentIndex = 0;

    const formattedDocuments: Document[] = [];

    try {
      for (const { content, metadata } of array) {
        currentIndex++;

        const fileContentHash = hash('md5', content, 'hex');
        const previousEmbedding = await EmbeddingHistories.findOne({
          where: { knowledgeId: knowledgeId, documentId: this.documentId, contentHash: fileContentHash },
        });

        if (!fileContentHash || !content) {
          logger.warn('file content hash is not available', { processedFilePath });

          if (currentTotal > 1) {
            const embeddingStatus = `${currentIndex}/${currentTotal}`;
            logger.info('embeddingStatus', embeddingStatus);
            await this.send({ embeddingStatus, error: null }, 'change');
          }

          continue;
        }

        if (previousEmbedding?.status === UploadStatus.Success && previousEmbedding?.contentHash === fileContentHash) {
          logger.warn('embedding already exists', {
            knowledgeId: knowledgeId,
            documentId: this.documentId,
            contentHash: fileContentHash,
            previousEmbeddingContentHash: previousEmbedding.contentHash,
          });

          if (currentTotal > 1) {
            const embeddingStatus = `${currentIndex}/${currentTotal}`;
            logger.info('embeddingStatus', embeddingStatus);
            await this.send({ embeddingStatus, error: null }, 'change');
          }

          continue;
        }

        if (previousEmbedding) {
          await previousEmbedding.update({
            contentHash: fileContentHash,
            startAt: new Date(),
            status: UploadStatus.Uploading,
          });
        } else {
          await EmbeddingHistories.create({
            contentHash: fileContentHash,
            knowledgeId: knowledgeId,
            documentId: this.documentId,
            startAt: new Date(),
            status: UploadStatus.Uploading,
          });
        }

        const result = await getFormattedDocs({
          metadata,
          content: this.preprocessText(content),
          type: document.type,
        }).catch((error) => {
          logger.error('saveContentToVectorStore error', error);
          return [];
        });

        formattedDocuments.push(...(result as Document[]));

        if (currentTotal > 1) {
          const embeddingStatus = `${currentIndex}/${currentTotal}`;
          logger.info('embeddingStatus', embeddingStatus);
          await this.send({ embeddingStatus, error: null }, 'change');
        }

        await EmbeddingHistories.update(
          { endAt: new Date(), status: UploadStatus.Success },
          { where: { knowledgeId: knowledgeId, documentId: this.documentId } }
        );
      }
    } catch (error) {
      logger.error('startRAG error', error);

      await EmbeddingHistories.update(
        { error: (error as Error)?.message, status: UploadStatus.Error },
        { where: { knowledgeId: knowledgeId, documentId: this.documentId } }
      );
      throw error;
    } finally {
      return formattedDocuments;
    }
  }
}
