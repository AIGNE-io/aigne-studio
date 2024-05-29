import { UpdateProjectInput } from '@api/routes/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, MenuItem, Select, Stack, Typography } from '@mui/material';

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
  value,
}: {
  value: UpdateProjectInput;
  set: (key: string, value: any) => void;
}) {
  const { appearance } = value;

  const { t } = useLocaleContext();

  return (
    <Stack gap={1}>
      <Box>
        <Stack>
          <Typography variant="subtitle3">{t('projectSetting.fontFamily.title')}</Typography>
          <Select
            value={appearance?.typography?.heading?.fontFamily || ''}
            onChange={(e) =>
              set('appearance', {
                ...appearance,
                typography: {
                  ...appearance?.typography,
                  heading: { ...appearance?.typography?.heading, fontFamily: e.target.value },
                },
              })
            }>
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
          <Select
            value={appearance?.typography?.fontFamily || ''}
            onChange={(e) =>
              set('appearance', {
                ...appearance,
                typography: { ...appearance?.typography, fontFamily: e.target.value },
              })
            }>
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
