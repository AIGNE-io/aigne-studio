import { readFile } from 'fs/promises';

import { getSourceFileDir } from '@api/libs/ensure-dir';
import { exists } from 'fs-extra';
import { cloneDeep } from 'lodash';
import { joinURL } from 'ufo';
import { stringify } from 'yaml';

import { BaseProcessor } from './base';

export class CustomProcessor extends BaseProcessor {
  protected async saveOriginalFile(): Promise<void> {
    // @ts-ignore 保存时，会直接写成文件
  }

  protected async ProcessedFile(): Promise<void> {
    const document = await this.getDocument();

    const originalFilePath = joinURL(getSourceFileDir(this.knowledgeId), document.filename!);
    if (!(await exists(originalFilePath))) {
      throw new Error(`processed file ${originalFilePath} not found`);
    }

    this.content = stringify({
      content: await readFile(originalFilePath, 'utf8'),
      metadata: {
        documentId: this.documentId,
        data: cloneDeep({
          type: document.data?.type,
          title: document.name,
        }),
      },
    });
  }
}
