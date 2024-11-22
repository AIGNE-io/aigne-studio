/* eslint-disable no-await-in-loop */
import { hash } from 'crypto';
import { stat, writeFile } from 'fs/promises';
import { join } from 'path';

import { getProcessedFileDir } from '@api/libs/ensure-dir';
import logger from '@api/libs/logger';
import { exists, readFile } from 'fs-extra';
import { parse } from 'yaml';

import DatasetDocument, { UploadStatus } from '../../../store/models/dataset/document';
import EmbeddingHistories from '../../../store/models/dataset/embedding-history';
import { saveContentToVectorStore } from '../util/vector-store';

export abstract class BaseProcessor {
  protected knowledgeId: string;

  protected documentId: string;

  protected sse: any;

  public content?: string;

  protected processedFileName: string;

  protected update: boolean;

  constructor({
    knowledgeId,
    documentId,
    sse,
    update = false,
  }: {
    knowledgeId: string;
    documentId: string;
    sse: any;
    update?: boolean;
  }) {
    this.knowledgeId = knowledgeId;
    this.documentId = documentId;
    this.sse = sse;
    this.update = update;

    this.processedFileName = `${this.documentId}.yml`;
  }

  protected async saveProcessedFile(): Promise<void> {
    const processedFilePath = join(getProcessedFileDir(this.knowledgeId), this.processedFileName);
    if (!this.content) throw new Error('process file content is not available');

    await writeFile(processedFilePath, this.content!);

    await DatasetDocument.update(
      { size: (await stat(processedFilePath)).size },
      { where: { id: this.documentId, knowledgeId: this.knowledgeId } }
    );
  }

  private async send({ ...props }: any, type: 'error' | 'complete' | 'change') {
    const document = await this.getDocument();
    const result = await document.update({ ...props });
    this.sse.send({ documentId: this.documentId, ...result.dataValues }, type);

    return result.dataValues;
  }

  async execute(): Promise<void> {
    try {
      await this.send({ embeddingStatus: UploadStatus.Uploading, embeddingStartAt: new Date() }, 'change');

      logger.info('save original file');
      await this.saveOriginalFile();

      const document = await this.getDocument();
      if (!document.filename) {
        throw new Error('get processed file path failed');
      }

      logger.info('processed file');
      await this.ProcessedFile();
      logger.info('save processed file');
      await this.saveProcessedFile();
      logger.info('start RAG');
      await this.startRAG();
      logger.info('send complete');
      await this.send({ embeddingStatus: UploadStatus.Success, embeddingEndAt: new Date(), error: null }, 'complete');
    } catch (error) {
      const message = error?.message;
      logger.error('execute embedding pipeline error', message);
      await this.send({ error: message, embeddingStatus: UploadStatus.Error, embeddingEndAt: new Date() }, 'error');
      throw error;
    }
  }

  async getDocument(): Promise<DatasetDocument> {
    const document = await DatasetDocument.findOne({ where: { id: this.documentId, knowledgeId: this.knowledgeId } });
    if (!document) throw new Error(`document ${this.documentId} not found`);
    return document;
  }

  preprocessText(text: string): string {
    // 替换连续的空格、换行符和制表符
    let processed = text.replace(/\s+/g, ' ');
    // 删除 URL
    processed = processed.replace(/https?:\/\/(?:[\w-]+\.)+[a-z]{2,}(?:\/[^\s]*)?/gi, '');
    // 删除邮件地址
    processed = processed.replace(/[\w.-]+@[\w.-]+\w+/g, '');

    return processed.trim();
  }

  protected abstract saveOriginalFile(): Promise<void>;

  protected abstract ProcessedFile(): Promise<void>;

  protected async startRAG(): Promise<void> {
    const processedFilePath = join(getProcessedFileDir(this.knowledgeId), this.processedFileName);
    if (!(await exists(processedFilePath))) throw new Error(`processedFilePath ${processedFilePath} not found`);

    const fileContent = (await readFile(processedFilePath)).toString();
    const fileContentHash = hash('md5', fileContent, 'hex');
    const previousEmbedding = await EmbeddingHistories.findOne({
      where: { knowledgeId: this.knowledgeId, documentId: this.documentId },
    });

    if (
      fileContentHash &&
      previousEmbedding?.status === UploadStatus.Success &&
      previousEmbedding?.contentHash === fileContentHash
    ) {
      logger.warn('embedding already exists', { knowledgeId: this.knowledgeId, documentId: this.documentId });
      return;
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
        knowledgeId: this.knowledgeId,
        documentId: this.documentId,
        startAt: new Date(),
        status: UploadStatus.Uploading,
      });
    }

    const contents = parse(fileContent);
    const array = Array.isArray(contents) ? contents : [contents];

    const currentTotal = array.length;
    let currentIndex = 0;

    try {
      for (const { content, metadata } of array) {
        currentIndex++;

        await saveContentToVectorStore({
          metadata,
          content: this.preprocessText(content),
          knowledgeId: this.knowledgeId,
          documentId: this.documentId,
          update: this.update,
        });

        if (currentTotal > 1) {
          const embeddingStatus = `${currentIndex}/${currentTotal}`;
          await this.send({ embeddingStatus, error: null }, 'change');
        }
      }

      await EmbeddingHistories.update(
        { endAt: new Date(), status: UploadStatus.Success },
        { where: { knowledgeId: this.knowledgeId, documentId: this.documentId } }
      );
    } catch (error) {
      logger.error('startRAG error', error);

      await EmbeddingHistories.update(
        { error: error.message, status: UploadStatus.Error },
        { where: { knowledgeId: this.knowledgeId, documentId: this.documentId } }
      );

      throw error;
    }
  }

  async getProcessedFile(): Promise<string> {
    const processedFilePath = join(getProcessedFileDir(this.knowledgeId), this.processedFileName);

    if (!(await exists(processedFilePath))) return '';

    return JSON.stringify(parse((await readFile(processedFilePath)).toString()));
  }
}
