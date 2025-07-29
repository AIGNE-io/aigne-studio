import styled from '@emotion/styled';
import { Avatar, Box, BoxProps, TextField, TextFieldProps, Tooltip, Typography } from '@mui/material';
import { uniqBy } from 'lodash';

import { useProjectStore } from '../../pages/project/yjs-state';
import WithAwareness from './with-awareness';

const UserBlock = styled('div')({
  display: 'flex',
  alignItems: 'center',
});

const UserAvatar = styled(Avatar)({
  width: '16px',
  height: '16px',
  marginRight: '8px',
});

export default function IndicatorTextField({
  projectId,
  gitRef,
  path,
  TextFiledProps,
  boxProps,
}: {
  projectId: string;
  gitRef: string;
  path: (string | number)[];
  TextFiledProps?: TextFieldProps;
  boxProps?: BoxProps;
}) {
  const {
    awareness: { clients, files },
  } = useProjectStore(projectId, gitRef);

  const file = path.slice(0, 1);
  const field = path.slice(1);
  const current = file.length ? (field.length ? files[file[0]!]?.fields[field.join('.')] : files[file[0]!]) : undefined;
  const filterClients = uniqBy(current?.clients, 'clientID');
  const boxSx = boxProps?.sx ?? {};

  return (
    <Box
      {...boxProps}
      sx={[
        {
          position: 'relative',
        },
        ...(Array.isArray(boxSx) ? boxSx : [boxSx]),
      ]}>
      <WithAwareness indicator={false} projectId={projectId} gitRef={gitRef} path={path}>
        <TextField {...TextFiledProps} />
      </WithAwareness>
      {!!current?.clients.length && (
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
              position: 'absolute',
              top: -2,
              right: -2,
              background: (theme) => theme.palette.success.light,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
            }}
          />
        </Tooltip>
      )}
    </Box>
  );
}
