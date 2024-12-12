import { mkdir } from 'fs/promises';
import path from 'path';

import { pathExists } from 'fs-extra';

import { Config } from './env';

async function ensureKnowledgeDirExists(knowledgeId?: string) {
  await mkdir(Config.knowledgeDir, { recursive: true });

  if (knowledgeId) {
    if (knowledgeId.startsWith('/')) return;

    const knowledgeDir = path.join(Config.knowledgeDir, knowledgeId);
    await Promise.all([
      mkdir(path.join(knowledgeDir, 'uploads'), { recursive: true }),
      mkdir(path.join(knowledgeDir, 'vectors'), { recursive: true }),
      mkdir(path.join(knowledgeDir, 'processed'), { recursive: true }),
      mkdir(path.join(knowledgeDir, 'sources'), { recursive: true }),
    ]);
  }
}

const getDir = (knowledgeId: string, type?: 'uploads' | 'vectors' | 'sources' | 'processed') => {
  return path.join(Config.knowledgeDir, knowledgeId, type || '');
};

export const getKnowledgeDir = (knowledgeId: string) => getDir(knowledgeId);
export const getUploadDir = (knowledgeId: string) => getDir(knowledgeId, 'uploads');
export const getVectorDir = (knowledgeId: string) => getDir(knowledgeId, 'vectors');
export const getSourceFileDir = (knowledgeId: string) => getDir(knowledgeId, 'sources');
export const getProcessedFileDir = (knowledgeId: string) => getDir(knowledgeId, 'processed');
export const getLogoPath = (knowledgeId: string) => path.join(getKnowledgeDir(knowledgeId), 'logo.png');

export const getOldVectorStorePath = (id: string) => path.join(Config.dataDir, 'vectors', id);
export const getOldUploadPath = (file: string) => path.join(Config.uploadDir, file);

export const getVectorStorePath = async (knowledgeId: string) => {
  if (knowledgeId && (await pathExists(getVectorDir(knowledgeId)))) {
    return getVectorDir(knowledgeId);
  }

  return getOldVectorStorePath(knowledgeId);
};

export const getUploadPath = async (knowledgeId: string, file: string) =>
  knowledgeId && (await pathExists(getUploadDir(knowledgeId)))
    ? path.join(getUploadDir(knowledgeId), file)
    : getOldUploadPath(file);

export const getUploadPathByCheckFile = async (knowledgeId: string, file?: string) =>
  file && (await pathExists(file)) ? file : getUploadPath(knowledgeId, file || '');

export default ensureKnowledgeDirExists;
