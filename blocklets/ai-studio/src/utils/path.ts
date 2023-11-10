export default function dirname(path: string) {
  return path.split('/').filter(Boolean).slice(0, -1).join('/');
}

export function getTemplateIdFromPath(path: string) {
  return path.match(/\/?(?<templateId>\S+).yaml$/)?.groups?.templateId;
}
