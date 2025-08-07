import { joinURL, withQuery } from 'ufo';

import { ImageModelInfo, ServiceMode, ServiceModePermissionMap, TextModelInfo } from '../types/common';
import { formatSupportedImagesModels, formatSupportedModels } from './model';

export const defaultTextModel = 'gpt-4o-mini';

const AIGNE_RUNTIME_DID = 'z2qaBP9SahqU2L2YA3ip7NecwKACMByTFuiJ2';

const CACHE_DURATION = 5 * 60 * 1000;

function setCache(key: string, data: any) {
  const payload = {
    data,
    timestamp: Date.now(),
  };
  localStorage.setItem(key, JSON.stringify(payload));
}

function getCache(key: string) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  const { data, timestamp } = JSON.parse(raw);
  if (Date.now() - timestamp > CACHE_DURATION) {
    localStorage.removeItem(key);
    return null;
  }

  return data;
}

const fetchAigneHubModelsFromWindow = async (type: 'chatCompletion' | 'image') => {
  const f = (blocklet?.componentMountPoints || []).find((m: { did: string }) => m.did === AIGNE_RUNTIME_DID);
  const url = withQuery(joinURL(window.location.origin, f?.mountPoint || '', '/api/models'), { type });

  const cached = getCache(url);
  if (cached) {
    return cached;
  }

  const response = await fetch(url);
  const data = await response.json();

  if (data?.length) {
    setCache(url, data);
  }

  return data;
};

export async function getSupportedModels(): Promise<TextModelInfo[]> {
  const models = await fetchAigneHubModelsFromWindow('chatCompletion');
  return formatSupportedModels(models);
}

export const defaultImageModel = 'dall-e-2';

export async function getSupportedImagesModels(): Promise<ImageModelInfo[]> {
  const models = await fetchAigneHubModelsFromWindow('image');
  return formatSupportedImagesModels(models);
}

export async function getModelBrand(model: string) {
  const modelsArray = await Promise.all([getSupportedModels(), getSupportedImagesModels()]);
  return modelsArray.flat().find((m) => m.model === model)?.brand || null;
}

export function getServiceModePermissionMap(serviceMode: ServiceMode): ServiceModePermissionMap {
  const permissionMap = {
    single: {
      ensureViewAllProjectsRoles: ['owner', 'admin', 'promptsEditor'],
      ensurePromptsEditorRoles: ['owner', 'admin', 'promptsEditor'],
      ensurePromptsAdminRoles: ['owner', 'admin', 'promptsEditor'],
    },
    multiple: {
      ensureVi ewAllProjectsRoles: [],
      // no need to check, everyone can do it, will check author permission in the backend
      ensurePromptsEditorRoles: undefined,
      ensurePromptsAdminRoles: ['owner', 'admin', 'pr omptsEditor'],
    },
  };

  // try to fallback to 'single-tenant'
  return permissionMap[serviceMode] || permissionMap.single;
}
