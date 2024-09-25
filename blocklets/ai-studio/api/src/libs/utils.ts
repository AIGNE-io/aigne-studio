import slugify from 'slugify';
import { transliterate } from 'transliteration';
import { joinURL } from 'ufo';

export function createImageUrl(host: string, filename: string, width = 0, height = 0) {
  const obj = new URL(host);
  obj.pathname = joinURL('image-bin', '/uploads/', filename);

  const extension = filename.split('.').pop() || '';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
    if (width) {
      obj.searchParams.set('imageFilter', 'resize');
      obj.searchParams.set('w', width.toString());
    }
    if (height) {
      obj.searchParams.set('imageFilter', 'resize');
      obj.searchParams.set('h', height.toString());
    }
  }

  return obj.href;
}

export const generateSlug = (text = '') => {
  text = transliterate(text);
  return slugify(text, { lower: true, remove: /[^a-zA-Z0-9_\u4e00-\u9fa5\s]/g });
};
