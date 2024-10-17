import { cx } from '@emotion/css';
import { Stack, StackProps } from '@mui/material';

export default function SimpleLayout({ ...props }: StackProps) {
  return (
    <Stack
      flexGrow={1}
      maxWidth="md"
      width="100%"
      mx="auto"
      px={{ xs: 2, sm: 3 }}
      {...props}
      className={cx('aigne-layout aigne-layout-simple', props.className)}
    />
  );
}
