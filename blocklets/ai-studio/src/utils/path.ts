export default function dirname(path?: string) {
  return path?.split('/').filter(Boolean).slice(0, -1) ?? [];
}

export function getFileIdFromPath(path: string) {
  const filename = path.split('/').slice(-1)[0];
  if (filename?.endsWith('.yaml')) return filename.match(/(?<fileId>.*).yaml$/)?.groups?.fileId;
  return undefined;
}
