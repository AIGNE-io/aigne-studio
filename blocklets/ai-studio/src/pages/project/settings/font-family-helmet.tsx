import { Helmet } from 'react-helmet';

const chineseFonts = [
  {
    key: '东方大楷',
    value: 'Alimama DongFangDaKai',
    link: 'https://cdn.jsdelivr.net/npm/cn-fontsource-alimama-dong-fang-da-kai-regular/font.css',
  },
  {
    key: '鸿雷行书',
    value: 'hongleixingshu',
    link: 'https://cdn.jsdelivr.net/npm/cn-fontsource-hongleixingshu-regular/font.css',
  },
  {
    key: '方正楷体',
    value: 'FZKai-Z03',
    link: 'https://cdn.jsdelivr.net/npm/cn-fontsource-fz-kai-z-03-regular/font.css',
  },
  {
    key: '方正书宋',
    value: 'FZShuSong-Z01',
    link: 'https://cdn.jsdelivr.net/npm/cn-fontsource-fz-shu-song-z-01-regular/font.css',
  },
  {
    key: '方正黑体',
    value: 'FZHei-B01',
    link: 'https://cdn.jsdelivr.net/npm/cn-fontsource-fz-hei-b-01-regular/font.css',
  },
  {
    key: '方正仿宋',
    value: 'FZFangSong-Z02S',
    link: 'https://cdn.jsdelivr.net/npm/cn-fontsource-fz-fang-song-z-02-s-regular/font.css',
  },
];

export const defaultFonts = [
  // Sans-serif 字体
  { group: 'English' },
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
  'Montserrat',
  'Montserrat Alternates',
  'Montserrat Subrayada',
  'Raleway',
  'Raleway Dots',
  'Playfair Display',
  'Playfair Display SC',
  'Poppins',
  'Merriweather',
  'Merriweather Sans',
  'Open Sans',

  // 中文字体
  { group: 'Chinese' },
  'Chocolate Classical Sans',
  'Cactus Classical Serif',
  'LXGW WenKai Mono TC',
  'LXGW WenKai TC',
  'ZCOOL XiaoWei',
  'ZCOOL QingKe HuangYou',
  'ZCOOL KuaiLe',
  'Noto Sans SC',
  'Ma Shan Zheng',
  'Long Cang',
  ...chineseFonts,
  // 系统默认字体
  { group: 'System' },
  'Roboto',
  'Ubuntu',
  'Cantarell',
];

export const getFontUrl = (fontList: any[]) => {
  if (!fontList.length) return;

  const BASE_URL = 'https://fonts.googleapis.com/css?family=';
  const newFontList = fontList
    .filter((font) => typeof font === 'string')
    ?.map((font) => font.replace(/ /g, '+'))
    .join('|');

  // eslint-disable-next-line consistent-return
  return `${BASE_URL}${newFontList}`;
};

export function FontFamilyHelmet() {
  return (
    <Helmet>
      <link rel="stylesheet" href={getFontUrl(defaultFonts)} />
      {...chineseFonts.map((font) => <link rel="stylesheet" href={font.link} />)}
    </Helmet>
  );
}
