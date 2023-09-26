import styled from '@emotion/styled';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import React from 'react';

function RoleSelectComp({ text, onChange }: { text: string; onChange: (data: string) => void }): JSX.Element {
  const [role, setRole] = React.useState(text);

  const handleChange = (event: SelectChangeEvent) => {
    setRole(event.target.value as string);
    onChange(event.target.value as string);
  };

  return (
    <Root>
      <Select size="small" value={role} onChange={handleChange}>
        <MenuItem value="system">System</MenuItem>
        <MenuItem value="user">User</MenuItem>
        <MenuItem value="assistant">Assistant</MenuItem>
      </Select>
    </Root>
  );
}

const Root = styled(Box)`
  display: inline-block;
  margin-right: 4px;
`;

export default RoleSelectComp;
