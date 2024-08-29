import { access, mkdir } from 'fs/promises';
import path from 'path';

import { pathExists } from 'fs-extra';

import { Config } from './env';

async function ensureDirExists(dir: string) {
  if (await pathExists(dir)) return;

  try {
    await access(dir);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await mkdir(dir, { recursive: true });
    } else {
      throw error;
    }
  }
}

async function ensureKnowledgeDirExists(knowledgeId?: string) {
  await ensureDirExists(Config.knowledgeDir);

  if (knowledgeId) {
    if (knowledgeId.startsWith('/')) return;

    const knowledgeDir = path.join(Config.knowledgeDir, knowledgeId);
    await Promise.all([
      ensureDirExists(path.join(knowledgeDir, 'uploads')),
      ensureDirExists(path.join(knowledgeDir, 'vectors')),
    ]);
  }
}

const getDir = (type: 'uploads' | 'vectors' | '', knowledgeId: string) => {
  return path.join(Config.knowledgeDir, knowledgeId, type);
};

export const getUploadDir = (knowledgeId: string) => getDir('uploads', knowledgeId);
export const getVectorDir = (knowledgeId: string) => getDir('vectors', knowledgeId);
export const getKnowledgeDir = (knowledgeId: string) => getDir('', knowledgeId);

export const getOldVectorStorePath = (id: string) => path.join(Config.dataDir, 'vectors', id);
export const getOldUploadPath = (file: string) => path.join(Config.uploadDir, file);

export const getVectorStorePath = async (knowledgeId: string) =>
  knowledgeId && (await pathExists(getVectorDir(knowledgeId)))
    ? getVectorDir(knowledgeId)
    : getOldVectorStorePath(knowledgeId);

export const getUploadPath = async (knowledgeId: string, file: string) =>
  knowledgeId && (await pathExists(getUploadDir(knowledgeId)))
    ? path.join(getUploadDir(knowledgeId), file)
    : getOldUploadPath(file);

export const getUploadPathByCheckFile = async (knowledgeId: string, file?: string) =>
  file && (await pathExists(file)) ? file : getUploadPath(knowledgeId, file || '');

export default ensureKnowledgeDirExists;
