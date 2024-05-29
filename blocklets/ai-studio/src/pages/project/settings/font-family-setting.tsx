import { UpdateProjectInput } from '@api/routes/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, MenuItem, Select, Stack, Typography } from '@mui/material';

const defaultFonts = [
  // Sans-serif 字体
  'Arial',
  'Helvetica',
  'Verdana',
  'Tahoma',
  'Trebuchet MS',
  'Gill Sans',
  'Lucida Grande',
  'Geneva',

  // Serif 字体
  'Times New Roman',
  'Georgia',
  'Garamond',
  'Palatino',
  'Bookman',
  'Courier New', // 也可归类为 Monospace 字体

  // Monospace 字体
  'Lucida Console',
  'Monaco',

  // Cursive 字体
  'Comic Sans MS',
  'Brush Script MT',

  // Fantasy 字体
  'Impact',
  'Papyrus',

  // 中文字体
  'SimSun', // 宋体
  'SimHei', // 黑体
  'Microsoft YaHei', // 微软雅黑
  'Microsoft JhengHei', // 微软正黑体
  'STFangsong', // 华文仿宋
  'STKaiti', // 华文楷体
  'STSong', // 华文宋体
  'STHeiti', // 华文黑体
  'PingFang SC', // 苹方 简体
  'PingFang TC', // 苹方 繁体
  'Hiragino Sans GB', // 冬青黑体简体
  'Noto Sans CJK SC', // 思源黑体 简体
  'Noto Sans CJK TC', // 思源黑体 繁体

  // 系统默认字体
  '-apple-system',
  'BlinkMacSystemFont',
  'Segoe UI',
  'Roboto',
  'Oxygen-Sans',
  'Ubuntu',
  'Cantarell',
  'sans-serif',
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
