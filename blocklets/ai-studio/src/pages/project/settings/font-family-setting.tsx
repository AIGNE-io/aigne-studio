import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ConfigFileYjs } from '@blocklet/ai-runtime/types';
import { Box, ListSubheader, MenuItem, Select, SelectProps, Stack, Typography } from '@mui/material';
import { cloneDeep } from 'lodash';
import { Helmet } from 'react-helmet';

import { defaultFonts } from './font-family-helmet';

export default function FontFamilySetting({
  config,
  setConfig,
}: {
  config: ConfigFileYjs | undefined;
  setConfig: (update: (config: ConfigFileYjs) => void) => void;
}) {
  const { appearance } = config || {};

  const { t } = useLocaleContext();

  return (
    <Stack gap={1}>
      <Box>
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.title')}</Typography>
          <FontSelect
            value={appearance?.typography?.heading?.fontFamily || ''}
            onChange={(e) => {
              setConfig((config) => {
                config.appearance = cloneDeep({
                  ...config.appearance,
                  typography: {
                    ...config.appearance?.typography,
                    heading: { ...config.appearance?.typography?.heading, fontFamily: e.target.value },
                  },
                });
              });
            }}
          />
        </Stack>
      </Box>
      <Box>
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.body')}</Typography>
          <FontSelect
            value={appearance?.typography?.fontFamily || ''}
            onChange={(e) => {
              setConfig((config) => {
                config.appearance = cloneDeep({
                  ...config.appearance,
                  typography: { ...config.appearance?.typography, fontFamily: e.target.value },
                });
              });
            }}
          />
        </Stack>
      </Box>
    </Stack>
  );
}

function FontSelect({ ...props }: SelectProps) {
  const { t } = useLocaleContext();

  return (
    <Select {...props} MenuProps={{ MenuListProps: { sx: { p: 0 } } }}>
      <MenuItem value="">{t('default')}</MenuItem>
      {defaultFonts.map((f: string | { key: string; value: string; link: string } | { group: string }) =>
        typeof f === 'string' ? (
          <MenuItem key={f} value={f} style={{ fontFamily: f }}>
            {f}
          </MenuItem>
        ) : 'key' in f ? (
          <MenuItem key={f.key} value={f.value} style={{ fontFamily: f.value }}>
            {f.key}
          </MenuItem>
        ) : f.group ? (
          <ListSubheader key={f.group} disableGutters sx={{ px: 1, py: 0, lineHeight: 2, bgcolor: 'grey.100' }}>
            {f.group}
          </ListSubheader>
        ) : null
      )}
    </Select>
  );
}
