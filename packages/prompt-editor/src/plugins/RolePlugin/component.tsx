import MenuItem from '@mui/material/MenuItem';
import Select, { SelectProps, selectClasses } from '@mui/material/Select';

function RoleSelectComp(props: SelectProps<string>) {
  return (
    <Select
      {...props}
      sx={{
        mr: 0.5,
        [`.${selectClasses.select}`]: {
          fontSize: 12,
          px: 1,
          pr: '18px !important',
        },
        [`.${selectClasses.icon}`]: {
          fontSize: 16,
          right: 2,
        },
        ...props.sx,
      }}>
      <MenuItem value="system">System</MenuItem>
      <MenuItem value="user">User</MenuItem>
      <MenuItem value="assistant">Assistant</MenuItem>
    </Select>
  );
}

export default RoleSelectComp;
