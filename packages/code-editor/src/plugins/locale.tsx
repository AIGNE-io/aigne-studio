import { get } from 'lodash';

import { translations } from '../../locales';

const useLocaleContext = (locale: string) => ({
  t: (key: string) => get((translations as any)?.[locale], key),
});

export default useLocaleContext;
