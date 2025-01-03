import { pathExists, readFile } from 'fs-extra';
import Joi from 'joi';
import { parse } from 'yaml';

export interface MemoryConfig {
  id: string;
}

export const memoryConfigSchema = Joi.object<MemoryConfig>({
  id: Joi.string().required(),
});

export async function loadConfig(path: string): Promise<MemoryConfig | null> {
  if (!(await pathExists(path))) return null;

  const raw = await readFile(path, 'utf-8');
  const obj = parse(raw);
  return await memoryConfigSchema.validateAsync(obj);
}
