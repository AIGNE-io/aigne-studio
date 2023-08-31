export default function dirname(path: string) {
  return path.split('/').filter(Boolean).slice(0, -1).join('/');
}
