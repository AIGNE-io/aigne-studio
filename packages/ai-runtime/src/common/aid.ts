import { Base64 } from 'js-base64';

export interface Identity {
  projectId: string;
  projectRef: string;
  assistantId: string;
}

export function parseIdentity(aid: string, options: { rejectWhenError: true }): Identity;
export function parseIdentity(aid: string, options?: { rejectWhenError?: false }): Identity | undefined;
export function parseIdentity(aid: string, options?: { rejectWhenError?: boolean }): Identity | undefined {
  let projectId: string | undefined;
  let projectRef: string | undefined;
  let assistantId: string | undefined;

  try {
    const s = Base64.decode(aid).split('/');
    [projectId, projectRef, assistantId] = s.length === 3 ? s : s.length === 2 ? [s[0], 'main', s[1]] : [];
  } catch (error) {
    console.error('parse assistantId error', { error });
  }

  if (projectId && projectRef && assistantId) return { projectId, projectRef, assistantId };

  if (options?.rejectWhenError) throw new Error(`Invalid assistant identity ${aid}`);

  return undefined;
}

export function stringifyIdentity({
  projectId,
  projectRef,
  assistantId,
}: {
  projectId: string;
  projectRef: string;
  assistantId: string;
}): string {
  if (typeof projectId !== 'string' || typeof projectRef !== 'string' || typeof assistantId !== 'string') {
    throw new Error('Invalid aid fragments');
  }

  return Base64.encodeURI([projectId, projectRef, assistantId].join('/'));
}
