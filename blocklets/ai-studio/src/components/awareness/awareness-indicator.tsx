import { Avatar, AvatarGroup, Box, BoxProps } from '@mui/material';

import { useStore } from '../../pages/project/yjs-state';

export default function AwarenessIndicator({
  path,
  ...props
}: {
  path: (string | number)[];
} & BoxProps) {
  const {
    awareness: { clients, files },
  } = useStore();

  const file = path.slice(0, 1);
  const field = path.slice(1);

  const current = file.length ? (field.length ? files[file[0]!]?.fields[field.join('.')] : files[file[0]!]) : undefined;

  if (!current?.clients.length) return null;

  return (
    <Box {...props} position="relative">
      <AvatarGroup spacing="small">
        {current.clients.map(({ clientId }) => (
          <Box
            key={clientId}
            component={Avatar}
            src={clients[clientId]?.avatar}
            sx={{ width: 20, height: 20, borderRadius: 100, boxShadow: 1 }}
          />
        ))}
      </AvatarGroup>
    </Box>
  );
}
