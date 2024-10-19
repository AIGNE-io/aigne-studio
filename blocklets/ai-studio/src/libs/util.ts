import { isAxiosError } from 'axios';
import slugify from 'slugify';
import { transliterate } from 'transliteration';

export const generateSlug = (text = '') => {
  text = transliterate(text);
  return slugify(text, { lower: true, remove: /[^a-zA-Z0-9_\u4e00-\u9fa5\s]/g });
};

export const checkErrorType = (error: any, type: string) => {
  const errorType = isAxiosError(error) ? error.response?.data?.error?.type : error.type;
  return errorType === type;
};
