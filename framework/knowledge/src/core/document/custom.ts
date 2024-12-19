import { readFile } from 'fs/promises';

import { exists, writeFile } from 'fs-extra';
import Joi from 'joi';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { parse, stringify } from 'yaml';

import KnowledgeDocument from '../../store/models/document';
import { BaseProcessor } from './base';

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

    content,
    title,
  }: {
    knowledgeVectorsFolderPath: string;
    knowledgeSourcesFolderPath: string;
    knowledgeProcessedFolderPath: string;
    knowledgePath: string;
    did: string;

    content: string;
    title: string;
  }) {
    super({ knowledgeVectorsFolderPath, knowledgeSourcesFolderPath, knowledgeProcessedFolderPath, knowledgePath, did });

    this.content = content;
    this.title = title;
  }

  protected async init(): Promise<void> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));
    if (!knowledge?.id) throw new Error('knowledge id is not found');

    await customDocumentSchema.validateAsync({ title: this.title, content: this.content }, { stripUnknown: true });
  }

  protected async saveOriginSource(): Promise<void> {
    const knowledge = parse(await readFile(this.knowledgePath, 'utf-8'));

    const document = await KnowledgeDocument.create({
      type: 'text',
      name: this.title,
      knowledgeId: knowledge.id,
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
