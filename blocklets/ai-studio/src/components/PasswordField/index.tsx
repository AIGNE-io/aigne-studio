import { Icon } from '@iconify-icon/react';
import type { TextFieldProps } from '@mui/material';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { forwardRef, useState } from 'react';

const PasswordField = forwardRef<HTMLDivElement, TextFieldProps>(({ ...props }, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setVisible(!visible)}>
              <Icon icon={visible ? 'tabler:eye' : 'tabler:eye-off'} />
            </IconButton>
          </InputAdornment>
        ),
        ...props.InputProps,
      }}
    />
  );
});

export default PasswordField;
