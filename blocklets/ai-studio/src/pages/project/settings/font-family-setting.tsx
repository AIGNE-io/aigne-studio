import { useCurrentProject } from '@app/contexts/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, ListSubheader, MenuItem, Select, SelectProps, Stack, Typography } from '@mui/material';

import { useProjectStore } from '../yjs-state';
import { defaultFonts } from './font-family-helmet';

export default function FontFamilySetting() {
  const { projectId, projectRef } = useCurrentProject();
  const { projectSetting } = useProjectStore(projectId, projectRef);
  const { appearance } = projectSetting || {};

  const { t } = useLocaleContext();

  return (
    <Stack sx={{
      gap: 1
    }}>
      <Box data-testid="font-family-setting-title">
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.title')}</Typography>
          <FontSelect
            value={appearance?.typography?.heading?.fontFamily || ''}
            onChange={(e) => {
              const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
              doc.transact(() => {
                projectSetting.appearance ??= {};
                projectSetting.appearance.typography ??= {};
                projectSetting.appearance.typography.heading ??= {};
                projectSetting.appearance.typography.heading.fontFamily = e.target.value;
              });
            }}
          />
        </Stack>
      </Box>
      <Box data-testid="font-family-setting-body">
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.body')}</Typography>
          <FontSelect
            value={appearance?.typography?.fontFamily || ''}
            onChange={(e) => {
              const doc = (getYjsValue(projectSetting) as Map<any>).doc!;
              doc.transact(() => {
                projectSetting.appearance ??= {};
                projectSetting.appearance.typography ??= {};
                projectSetting.appearance.typography.fontFamily = e.target.value;
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
