import { useCurrentProject } from '@app/contexts/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, ListSubheader, MenuItem, Select, SelectProps, Stack, Typography } from '@mui/material';

import { useProjectStore } from '../yjs-state';
import { defaultFonts } from './font-family-helmet';

export default function FontFamilySetting() {
  const { projectId, projectRef } = useCurrentProject();
  const { setProjectSetting, projectSetting } = useProjectStore(projectId, projectRef);
  const { appearance } = projectSetting || {};

  const { t } = useLocaleContext();

  return (
    <Stack gap={1}>
      <Box>
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.title')}</Typography>
          <FontSelect
            value={appearance?.typography?.heading?.fontFamily || ''}
            onChange={(e) => {
              setProjectSetting((config) => {
                config.appearance ??= {};
                config.appearance.typography ??= {};
                config.appearance.typography.heading ??= {};
                config.appearance.typography.heading.fontFamily = e.target.value;
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
              setProjectSetting((config) => {
                config.appearance ??= {};
                config.appearance.typography ??= {};
                config.appearance.typography.fontFamily = e.target.value;
              });
            }}
          />
        </Stack>
      </Box>
    </Stack>
  );
}

function FontSelect({ ...props }: SelectProps<string>) {
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
