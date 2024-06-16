import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ConfigFileYjs } from '@blocklet/ai-runtime/types';
import { Box, ListSubheader, MenuItem, Select, SelectProps, Stack, Typography } from '@mui/material';
import { cloneDeep } from 'lodash';
import { Helmet } from 'react-helmet';

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

const getFontUrl = (fontList: any[]) => {
  if (!fontList.length) return;

  const BASE_URL = 'https://fonts.googleapis.com/css?family=';
  const newFontList = fontList
    .filter((font) => typeof font === 'string')
    ?.map((font) => font.replace(/ /g, '+'))
    .join('|');

  // eslint-disable-next-line consistent-return
  return `${BASE_URL}${newFontList}`;
};

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
      <Helmet>
        <link rel="stylesheet" href={getFontUrl(defaultFonts)} />
      </Helmet>
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
