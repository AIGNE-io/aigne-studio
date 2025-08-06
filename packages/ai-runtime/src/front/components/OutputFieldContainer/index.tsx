import { Icon } from '@iconify/react';
import { Box, Stack, StackProps, Typography } from '@mui/material';
import { memo } from 'react';

import { OutputVariable } from '../../../types';

function OutputFieldContainer({ output = undefined, ...props }: { output?: OutputVariable } & StackProps) {
  return (
    <Stack
      {...props}
      sx={[
        {
          gap: 1,
        },
        ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
      ]}>
      {output?.appearance?.title && (
        <Typography
          component="h6"
          noWrap
          sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 18, fontWeight: 500 }}>
          {output.appearance.icon && <Box component={Icon} icon={output.appearance.icon} />}

          <Box component="span" sx={{ flex: 1, textOverflow: 'hidden' }}>
            {output.appearance.title}
          </Box>
        </Typography>
      )}
      {props.children}
    </Stack>
  );
}

export default memo(OutputFieldContainer);
