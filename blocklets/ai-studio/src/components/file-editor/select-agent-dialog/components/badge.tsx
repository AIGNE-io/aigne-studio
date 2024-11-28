import { Box, Popover } from '@mui/material';
import { useState } from 'react';

import Schema, { ObjectPropType } from './schema';

interface SelectAgentBadgeProps {
  schema?: ObjectPropType;
  name: string;
  bgcolor: string;
  fontColor: string;
  borderColor: string;
}
const SelectAgentBadge = ({ name, schema, bgcolor, fontColor, borderColor }: SelectAgentBadgeProps) => {
  const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);

  if (!schema || !schema.properties) return null;

  const count = Object.entries(schema.properties).length;
  if (!count) return null;

  return (
    <>
      <Box
        onClick={(e) => setAnchorEl(e.currentTarget)}
        sx={{
          display: 'inline-flex',
          px: 0.5,
          py: 0.25,
          borderRadius: 0.5,
          lineHeight: 1,
          fontSize: 12,
          bgcolor,
          color: fontColor,
          border: `1px solid ${borderColor}`,
          cursor: 'pointer',
        }}>
        {`${count} ${name}`}
      </Box>
      <Popover
        sx={{ zIndex: 1500 }}
        open={!!anchorEl}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClose={() => setAnchorEl(null)}>
        <Schema schema={schema} />
      </Popover>
    </>
  );
};

export default SelectAgentBadge;
