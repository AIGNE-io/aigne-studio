import { UpdateProjectInput } from '@api/routes/project';
import { loadFontList } from '@app/utils/font';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, ListSubheader, MenuItem, Select, SelectProps, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';

const defaultFonts = [
  // Sans-serif 字体
  { group: 'English' },
  'Arial',
  'Noto Sans Georgian',
  'Cedarville Cursive',
  'Recursive',
  'Noto Sans',
  'Noto Serif',
  'Inter',
  'Lora',
  'Chocolate Classical Sans',
  'Sevillana',
  'Karla',

  // 中文字体
  { group: 'Chinese' },
  'Chocolate Classical Sans',
  'Cactus Classical Serif',
  'LXGW WenKai Mono TC',
  'LXGW WenKai TC',
  'Noto Sans Traditional Chinese',
  'ZCOOL XiaoWei',
  'ZCOOL QingKe HuangYou',
  'ZCOOL KuaiLe',

  // 系统默认字体
  { group: 'System' },
  'Roboto',
  'Ubuntu',
  'Cantarell',
];

export default function FontFamilySetting({
  set,
  value,
}: {
  value: UpdateProjectInput;
  set: (key: string, value: any) => void;
}) {
  const { appearance } = value;

  const { t } = useLocaleContext();

  const loadFont = async (value: string[]) => {
    if (!value) return;

    if (document.querySelectorAll('link[href*="fonts.googleapis.com" i]').length) return;

    try {
      await loadFontList(value);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    loadFont(defaultFonts.filter((f) => typeof f === 'string') as string[]);
  }, []);

  return (
    <Stack gap={1}>
      <Box>
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.title')}</Typography>
          <FontSelect
            value={appearance?.typography?.heading?.fontFamily || ''}
            onChange={(e) =>
              set('appearance', {
                ...appearance,
                typography: {
                  ...appearance?.typography,
                  heading: { ...appearance?.typography?.heading, fontFamily: e.target.value },
                },
              })
            }
          />
        </Stack>
      </Box>
      <Box>
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.body')}</Typography>
          <FontSelect
            value={appearance?.typography?.fontFamily || ''}
            onChange={(e) =>
              set('appearance', {
                ...appearance,
                typography: { ...appearance?.typography, fontFamily: e.target.value },
              })
            }
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
      {defaultFonts.map((f) =>
        typeof f === 'string' ? (
          <MenuItem key={f} value={f} style={{ fontFamily: f }}>
            {f}
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
