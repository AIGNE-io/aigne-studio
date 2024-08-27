import { access, mkdir } from 'fs/promises';

import { joinURL } from 'ufo';

import { Config } from './env';

async function ensureDirExists(dir: string) {
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
    const knowledgeDir = joinURL(Config.knowledgeDir, knowledgeId);
    await ensureDirExists(knowledgeDir);

    const uploadDir = joinURL(knowledgeDir, 'uploads');
    await ensureDirExists(uploadDir);

    const modelDir = joinURL(knowledgeDir, 'vectors');
    await ensureDirExists(modelDir);
  }
}

export const getUploadDir = (knowledgeId: string) => joinURL(Config.knowledgeDir, knowledgeId, 'uploads');
export const getVectorDir = (knowledgeId: string) => joinURL(Config.knowledgeDir, knowledgeId, 'vectors');

export default ensureKnowledgeDirExists;
