import { joinURL, withQuery } from 'ufo';

const presets = {
  default: { w: undefined },
  avatar: { w: 80 },
};

export function getAssetUrl({
  projectId,
  projectRef,
  filename,
  w,
  preset,
}: {
  projectId: string;
  projectRef: string;
  filename: string;
  w?: number;
  preset?: keyof typeof presets;
}) {
  const url =
    filename && !filename?.startsWith('http')
      ? joinURL(window.blocklet.prefix, '/api/projects', projectId, 'refs', projectRef, 'assets', filename)
      : filename;

  const width = w ?? presets[preset!]?.w;

  return !width ? url : withQuery(url, { imageFilter: width ? 'resize' : undefined, w: width });
}
