import DidAvatar from '@arcblock/ux/lib/Avatar';
import { Avatar as MuiAvatar } from '@mui/material';

export interface Props {
  src?: string;
  [key: string]: any;
}

// base64 avatar 显示问题, 需要处理一下空格 (#121)
export default function Avatar({ src = undefined, ...rest }: Props) {
  if (src && src.startsWith('data:')) {
    // eslint-disable-next-line no-param-reassign
    src = src.replace(/\s/g, encodeURIComponent(' '));
  }

  if (!rest.did) return <MuiAvatar src={src} {...rest} />;

  return <DidAvatar src={src!} {...rest} />;
}
