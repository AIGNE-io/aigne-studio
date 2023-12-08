import { MenuItem, TextField, TextFieldProps } from '@mui/material';

export default function RoleSelectField({ ...props }: TextFieldProps) {
  return (
    <TextField select hiddenLabel {...props} SelectProps={{ autoWidth: true, ...props.SelectProps }}>
      <MenuItem value="system">System</MenuItem>
      <MenuItem value="user">User</MenuItem>
      <MenuItem value="assistant">Assistant</MenuItem>
    </TextField>
  );
}
