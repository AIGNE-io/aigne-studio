import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, MenuItem, Select, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

const defaultFonts = [
  'Arial',
  'Verdana',
  'Helvetica',
  'Tahoma',
  'Trebuchet MS',
  'Times New Roman',
  'Georgia',
  'Garamond',
  'Courier New',
  'Brush Script MT',
];

export default function FontFamilySetting({
  set,
  fontFamily,
}: {
  fontFamily: { titleFont: string | undefined; bodyFont: string | undefined };
  set: (key: string, value: any) => void;
}) {
  const [titleFont, setTitleFont] = useState(fontFamily.bodyFont || 'Arial');
  const [bodyFont, setBodyFont] = useState(fontFamily.titleFont || 'Arial');

  useEffect(() => {
    set('titleFont', titleFont);
  }, [titleFont]);

  useEffect(() => {
    set('bodyFont', bodyFont);
  }, [bodyFont]);

  const { t } = useLocaleContext();

  return (
    <Stack gap={1}>
      <Box>
        {/* todo: title select i18n */}
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.title')}</Typography>
          <Select value={titleFont} onChange={(e) => setTitleFont(e.target.value)}>
            {defaultFonts.map((f) => (
              <MenuItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Box>
      <Box>
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.body')}</Typography>
          <Select value={bodyFont} onChange={(e) => setBodyFont(e.target.value)}>
            {defaultFonts.map((f) => (
              <MenuItem key={f} value={f} style={{ fontFamily: f }}>
                {f}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      </Box>
    </Stack>
  );
}
