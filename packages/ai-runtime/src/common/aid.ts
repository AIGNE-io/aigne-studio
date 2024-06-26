import { Base64 } from 'js-base64';

const DEFAULT_PROJECT_REF = 'main';

export interface Identity {
  projectId: string;
  projectRef: string;
  agentId: string;
}

export function parseIdentity(aid: string, options: { rejectWhenError: true }): Identity;
export function parseIdentity(aid: string, options?: { rejectWhenError?: false }): Identity | undefined;
export function parseIdentity(aid: string, options?: { rejectWhenError?: boolean }): Identity | undefined {
  let projectId: string | undefined;
  let projectRef: string | undefined;
  let agentId: string | undefined;

  try {
    const s = Base64.decode(aid).split('/');
    [projectId, projectRef, agentId] = s.length === 3 ? s : s.length === 2 ? [s[0], 'main', s[1]] : [];
  } catch (error) {
    console.error('parse assistantId error', { error });
  }

  if (projectId && projectRef && agentId) return { projectId, projectRef, agentId };

  if (options?.rejectWhenError) throw new Error(`Invalid assistant identity ${aid}`);

  return undefined;
}

export function stringifyIdentity({
  projectId,
  projectRef,
  agentId,
}: {
  projectId: string;
  projectRef?: string;
  agentId: string;
}): string {
  if (typeof projectId !== 'string' || typeof agentId !== 'string') {
    throw new Error('Invalid aid fragments');
  }

  return Base64.encodeURI([projectId, projectRef || DEFAULT_PROJECT_REF, agentId].join('/'));
}
