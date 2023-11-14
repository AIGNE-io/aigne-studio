export default function dirname(path: string) {
  return path.split('/').filter(Boolean).slice(0, -1).join('/');
}

export function getTemplateIdFromPath(path: string) {
  const filename = path.split('/').slice(-1)[0];
  if (filename?.endsWith('.yaml')) return filename.match(/(?<templateId>.*).yaml$/)?.groups?.templateId;
  return undefined;
}
