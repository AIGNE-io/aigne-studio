import { cx } from '@emotion/css';
import { Stack, StackProps } from '@mui/material';

export default function SimpleLayout({ ...props }: StackProps) {
  return (
    <Stack
      {...props}
      className={cx('aigne-layout aigne-layout-simple', props.className)}
      sx={[{
        flexGrow: 1,
        maxWidth: "md",
        width: "100%",
        mx: "auto"
      }, ...(Array.isArray(props.sx) ? props.sx : [props.sx])]} />
  );
}
