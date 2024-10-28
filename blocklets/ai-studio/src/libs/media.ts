import { joinURL, withQuery } from 'ufo';

const PREFIX = window.blocklet?.prefix || '/';
const IMAGE_BIN_DID = 'z8ia1mAXo8ZE7ytGF36L5uBf9kD2kenhqFGp9';
const IMAGE_BIN_PREFIX =
  blocklet?.componentMountPoints.find((i) => i.did === IMAGE_BIN_DID)?.mountPoint || joinURL(PREFIX, '/image-bin');

export function getImageAbsoluteUrl(url: null): null;
export function getImageAbsoluteUrl(url: string): string;
export function getImageAbsoluteUrl(url?: undefined): undefined;
export function getImageAbsoluteUrl(url?: string): string | undefined;
export function getImageAbsoluteUrl(url?: string | null) {
  if (url && !/^(https?:\/\/|\/)/.test(url)) {
    return window.location.origin + joinURL(IMAGE_BIN_PREFIX, 'uploads', url);
  }
  return url;
}

export type ResizeImageSizes = 1200 | 540 | 260;

export type ImageOptimization = 'fast' | 'quality';

const isSmallScreen = window.innerWidth <= 750;

export function getOptimizedImageAbsUrl(
  url: string,
  width?: ResizeImageSizes,
  optimization?: ImageOptimization
): string {
  if (!url) return url;
  const absoluteUrl = getImageAbsoluteUrl(url);

  if (!width || /\.gif/.test(absoluteUrl)) return absoluteUrl;
  const w = (isSmallScreen ? width / 1.5 : width) * (optimization === 'quality' ? 1.5 : 1);

  return addQueryToUrl(absoluteUrl, { imageFilter: 'resize', w, f: 'webp' });
}

export function addQueryToUrl(url: string, query?: object) {
  if (!url || !query) return url;
  return withQuery(url, query as any);
}
