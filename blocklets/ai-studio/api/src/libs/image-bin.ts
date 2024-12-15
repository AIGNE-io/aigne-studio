import { call, getComponentMountPoint } from '@blocklet/sdk/lib/component';
import config from '@blocklet/sdk/lib/config';
import axios from 'axios';
import { joinURL } from 'ufo';

export async function uploadImageToImageBin({
  filename,
  data,
  userId,
}: {
  filename: string;
  data: { url: string; b64Json?: undefined } | { url?: undefined; b64Json: string };
  userId: string;
}) {
  const base64 =
    typeof data.url === 'string'
      ? Buffer.from((await axios.get(data.url, { responseType: 'arraybuffer' })).data).toString('base64')
      : data.b64Json;

  const { data: result } = await call<{ filename: string }>({
    name: 'image-bin',
    path: '/api/sdk/uploads',
    headers: { 'x-user-did': userId },
    data: { type: 'base64', data: base64, filename },
  });

  return { url: joinURL(config.env.appUrl, getComponentMountPoint('image-bin'), 'uploads', result.filename) };
}
