import WebFont from 'webfontloader';

export const defaultFont = 'Lato';

export const loadFontList = (newFontList: string[]) => {
  return new Promise((resolve, reject) => {
    if (newFontList?.length > 0) {
      WebFont.load({
        google: {
          families: newFontList,
        },
        fontactive: () => {
          resolve('success');
        },
        fontinactive: () => {
          reject(new Error('load font fail'));
        },
      });
    } else {
      resolve('success');
    }
  });
};
