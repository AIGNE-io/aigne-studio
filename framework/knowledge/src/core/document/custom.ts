import { readFile } from 'fs/promises';

import { exists, writeFile } from 'fs-extra';
import Joi from 'joi';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';

import KnowledgeDocument from '../../store/models/document';
import { BaseProcessor, BaseProcessorProps } from './base';

const customDocumentSchema = Joi.object<{ title: string; content: string }>({
  title: Joi.string().required(),
  content: Joi.string().required(),
});

export class CustomProcessor extends BaseProcessor {
  private content: string = '';
  private title: string = '';

  constructor({
    knowledgeVectorsFolderPath,
    knowledgeSourcesFolderPath,
    knowledgeProcessedFolderPath,
    knowledgePath,
    did,
    sendToCallback,
    content,
    title,
  }: BaseProcessorProps & {
    content: string;
    title: string;
  }) {
    super({
      knowledgeVectorsFolderPath,
      knowledgeSourcesFolderPath,
      knowledgeProcessedFolderPath,
      knowledgePath,
      did,
      sendToCallback,
    });

    this.content = content;
    this.title = title;
  }

  protected async init(): Promise<void> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));
    if (!knowledge?.id) throw new Error('knowledge id is not found');

    await customDocumentSchema.validateAsync({ title: this.title, content: this.content }, { stripUnknown: true });
  }

  protected async saveOriginSource(): Promise<void> {
    const document = await KnowledgeDocument.create({
      type: 'text',
      name: this.title,
      createdBy: this.did,
      updatedBy: this.did,
      embeddingStatus: 'idle',
      filename: '',
      size: 0,
      data: { type: 'text' },
    });

    this.documentId = document.id;
    const originalFileName = `${document.id}.txt`;
    const originalFilePath = joinURL(this.knowledgeSourcesFolderPath, originalFileName);
    await writeFile(originalFilePath, this.content);
    await document.update({ filename: originalFileName });
  }

  protected async ProcessedFile(): Promise<string> {
    const document = await this.getDocument();

    const { data } = document;
    if (data?.type !== 'text') throw new Error('document is not a text data');

    const originalFilePath = joinURL(this.knowledgeSourcesFolderPath, document.filename!);
    if (!(await exists(originalFilePath))) {
      throw new Error(`processed file ${originalFilePath} not found`);
    }

    return stringify({
      content: await readFile(originalFilePath, 'utf8'),
      metadata: {
        documentId: this.documentId,
        data: cloneDeep({ type: document.data?.type, title: document.name }),
      },
    });
  }
}
