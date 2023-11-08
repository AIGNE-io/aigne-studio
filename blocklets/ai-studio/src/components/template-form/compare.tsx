import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Tooltip } from '@mui/material';
import equal from 'fast-deep-equal';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import { FocusEventHandler, ReactElement } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';

export default function TemplateCompare({
  value,
  originValue,
  disabled,
  children,
  path,
}: {
  value: TemplateYjs;
  originValue?: TemplateYjs;
  disabled?: boolean;
  children: ReactElement<{ onFocus?: FocusEventHandler }>;
  path: keyof TemplateYjs | (keyof TemplateYjs)[];
}) {
  const { t } = useLocaleContext();

  const getDifference = (key: keyof TemplateYjs) => {
    if (disabled) {
      return false;
    }

    if (!originValue) {
      return false;
    }

    const getDefault = () => {
      if (key === 'tags') {
        return [];
      }

      if (key === 'next' || key === 'datasets') {
        return {};
      }

      if (key === 'temperature') {
        return 0;
      }

      return '';
    };

    return !equal(get(cloneDeep(originValue), key, getDefault()), get(cloneDeep(value), key, getDefault()));
  };

  const getDiff = () => {
    const list = Array.isArray(path) ? path : [path];
    return list.map((item) => getDifference(item)).some((x) => x);
  };

  return (
    <Box position="relative">
      {getDiff() && (
        <Tooltip title={t('compare.diff')}>
          <Box sx={{ color: 'rgb(207, 34, 46)', fontWeight: 'bold', position: 'absolute', left: '-20px', top: '2px' }}>
            M
          </Box>
        </Tooltip>
      )}

      {children}
    </Box>
  );
}
