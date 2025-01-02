import styled from '@emotion/styled';
import type { BoxProps } from '@mui/material';
import { Avatar, Box, Tooltip, Typography } from '@mui/material';
import { uniqBy } from 'lodash';

import { useProjectStore } from '../../pages/project/yjs-state';

const UserBlock = styled('div')({
  display: 'flex',
  alignItems: 'center',
});

const UserAvatar = styled(Avatar)({
  width: '16px',
  height: '16px',
  marginRight: '8px',
});

export default function AwarenessIndicator({
  projectId,
  gitRef,
  path,
  ...props
}: {
  projectId: string;
  gitRef: string;
  path: (string | number)[];
} & BoxProps) {
  const {
    awareness: { clients, files },
  } = useProjectStore(projectId, gitRef);

  const file = path.slice(0, 1);
  const field = path.slice(1);
  const current = file.length ? (field.length ? files[file[0]!]?.fields[field.join('.')] : files[file[0]!]) : undefined;
  const filterClients = uniqBy(current?.clients, 'clientID');

  if (!current?.clients.length) return null;

  return (
    <Box {...props} zIndex={1110} position="relative">
      <Tooltip
        placement="top"
        arrow
        title={
          <Box sx={{ p: '4px 2px' }}>
            {filterClients.slice(0, 4).map(({ clientId }) => (
              <UserBlock key={clientId}>
                <UserAvatar src={clients[clientId]?.avatar} />
                <Typography>{clients[clientId]?.fullName}</Typography>
              </UserBlock>
            ))}
          </Box>
        }>
        <Box
          sx={{
            background: (theme) => theme.palette.success.light,
            width: '8px',
            height: '8px',
            borderRadius: '50%',
          }}
        />
      </Tooltip>
    </Box>
  );
}
