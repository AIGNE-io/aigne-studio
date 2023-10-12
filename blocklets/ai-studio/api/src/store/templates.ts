import path from 'path';

import { Repository } from '@blocklet/co-git/repository';
import Database from '@blocklet/sdk/lib/database';
import { Worker } from 'snowflake-uuid';
import { parse } from 'yaml';

import { yjsToTemplate } from './projects';

const idGenerator = new Worker();

export const nextTemplateId = () => idGenerator.nextId().toString();

export type Role = 'system' | 'user' | 'assistant';

export const roles: Role[] = ['system', 'user', 'assistant'];

export interface Template {
  id: string;
  type?: 'branch' | 'image';
  mode?: 'default' | 'chat';
  name?: string;
  tags?: string[];
  icon?: string;
  description?: string;
  prompts?: { id: string; content?: string; role?: Role }[];
  branch?: {
    branches: { id: string; template?: { id: string; name?: string }; description: string }[];
  };
  parameters?: { [key: string]: Parameter };
  datasets?: { id: string; type: 'vectorStore'; vectorStore?: { id: string; name?: string } }[];
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  model?: string;
  next?: { id?: string; name?: string; outputKey?: string };
  versionNote?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export type Parameter = StringParameter | NumberParameter | SelectParameter | LanguageParameter | HoroscopeParameter;

export type ParameterType = NonNullable<Parameter['type']>;

export interface BaseParameter {
  label?: string;
  placeholder?: string;
  helper?: string;
  required?: boolean;
}

export interface StringParameter extends BaseParameter {
  type?: 'string';
  value?: string;
  defaultValue?: string;
  multiline?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface NumberParameter extends BaseParameter {
  type: 'number';
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
}

export interface SelectParameter extends BaseParameter {
  type: 'select';
  value?: string;
  defaultValue?: string;
  options?: { id: string; label: string; value: string }[];
}

export interface LanguageParameter extends BaseParameter {
  type: 'language';
  value?: string;
  defaultValue?: string;
}

export interface HoroscopeParameter extends BaseParameter {
  type: 'horoscope';
  value?: {
    time: string;
    offset?: number;
    location: { id: number; longitude: number; latitude: number; name: string };
  };
  defaultValue?: HoroscopeParameter['value'];
}

export default class Templates extends Database {
  constructor() {
    super('templates', { timestampData: false });
  }
}

export const templates = new Templates();

export async function getTemplate({
  repository,
  ref,
  working,
  templateId,
  filepath,
}: { repository: Repository<any>; ref: string; working?: boolean } & (
  | { templateId: string; filepath?: undefined }
  | { filepath: string; templateId?: undefined }
)): Promise<Template> {
  if (working) {
    const working = await repository.working({ ref });
    const id = templateId ?? path.parse(filepath).name;
    const key = Object.entries(working.syncedStore.tree).find(([, p]) => p && path.parse(p).name === id)?.[0];
    const file = working.syncedStore.files[key!];
    if (!file) throw new Error(`no such template ${templateId || filepath}`);
    return yjsToTemplate(file);
  }

  const template = parse(
    Buffer.from(
      (
        await repository.readBlob({
          ref,
          filepath: filepath ?? (await repository.findFile(templateId, { ref })),
        })
      ).blob
    ).toString()
  );

  const [projectId] = (repository.options.root || '').split('/').slice(-1) || [];

  template.projectId = projectId || '';
  template.ref = ref || 'main';

  return template;
}
