import slugify from 'slugify';
import { transliterate } from 'transliteration';

export const generateSlug = (text = '') => {
  text = transliterate(text);
  return slugify(text, { lower: true, remove: /[^a-zA-Z0-9_\u4e00-\u9fa5\s]/g });
};
