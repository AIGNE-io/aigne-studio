import { Icon } from '@iconify-icon/react';
import { IconButton, InputAdornment, TextField, TextFieldProps } from '@mui/material';
import { useState } from 'react';

const PasswordField = (
  {
    ref,
    ...props
  }: TextFieldProps & {
    ref: React.RefObject<HTMLDivElement | null>;
  }
) => {
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
};

export default PasswordField;
