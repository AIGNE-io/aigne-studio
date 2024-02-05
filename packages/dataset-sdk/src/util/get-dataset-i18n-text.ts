const getDatasetTextByI18n = (data: any, key: string, locale: string) => {
  const i18nKey: string = `x-${key}-${locale}`;
  return data[i18nKey] || data[key];
};

export default getDatasetTextByI18n;
