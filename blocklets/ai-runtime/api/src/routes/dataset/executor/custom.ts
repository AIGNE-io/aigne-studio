import { readFile, writeFile } from 'fs/promises';

import { getSourceFileDir } from '@api/libs/ensure-dir';
import { exists } from 'fs-extra';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { stringify } from 'yaml';

import { BaseProcessor } from './base';

export class CustomProcessor extends BaseProcessor {
  protected originalFileName: string;

  constructor({ knowledgeId, documentId, sse }: { knowledgeId: string; documentId: string; sse: any }) {
    super({ knowledgeId, documentId, sse });
    this.originalFileName = `${documentId}.txt`;
  }

  protected async saveOriginalFile(): Promise<void> {
    const document = await this.getDocument();

    const { data } = document;
    if (data?.type !== 'text') throw new Error('document is not custom data');

    const { title, content } = data;
    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), this.originalFileName);
    await writeFile(originalFilePath, `${title}\n${content}`);
    await document.update({ path: this.originalFileName });
  }

  protected async ProcessedFile(): Promise<void> {
    const document = await this.getDocument();
    const { data } = document;

    if (!document.path) {
      throw new Error('get processed file path failed');
    }

    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), document.path);
    if (!(await exists(originalFilePath))) {
      throw new Error(`processed file ${originalFilePath} not found`);
    }

    this.content = stringify({
      content: await readFile(originalFilePath, 'utf8'),
      metadata: { documentId: this.documentId, data: cloneDeep(data) },
    });
  }
}
