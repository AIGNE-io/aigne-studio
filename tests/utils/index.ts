export function toCamelCase(str: string) {
  const withoutExtension = str.replace(/\.[^/.]+$/, '');

  return withoutExtension
    .split(/[-_]/)
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
}

export const playwrightConfigAppNames = {
  single: 'single-tenant-mode-app',
  multiple: 'multiple-tenant-mode-app',
};
