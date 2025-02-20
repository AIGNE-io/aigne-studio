import { ParameterYjs } from '@blocklet/ai-runtime/types';
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

export const USER_INPUT_PARAMETER_TYPES: NonNullable<ParameterYjs['type']>[] = [
  'string',
  'number',
  'select',
  'language',
  'boolean',
  'image',
  'verify_vc',
];

export function isValidInput(input: Pick<ParameterYjs, 'key' | 'type'>): input is ParameterYjs & { key: string } {
  return !!input.key && USER_INPUT_PARAMETER_TYPES.includes(input.type || 'string');
}
