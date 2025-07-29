import { Box, Chip, MenuItem, TextField, TextFieldProps } from '@mui/material';
import isNil from 'lodash/isNil';

import { SelectParameter } from '../../types/assistant';

const SelectField = (
  {
    ref,
    readOnly,
    parameter,
    onChange,
    ...props
  }
) => {
  return (
    <TextField
      ref={ref}
      required={parameter?.required}
      label={parameter?.label}
      placeholder={parameter?.placeholder}
      helperText={parameter?.helper}
      select
      {...props}
      value={
        parameter?.multiple
          ? Array.isArray(props.value)
            ? props.value.filter((i) => !isNil(i) && i !== '')
            : props.value
              ? [props.value]
              : []
          : Array.isArray(props.value)
            ? props.value[0]
            : props.value
      }
      onChange={(e) => onChange(e.target.value)}
      InputProps={{ ...props.InputProps, readOnly }}
      SelectProps={{
        ...props.SelectProps,
        multiple: parameter?.multiple,
        renderValue: parameter?.multiple
          ? (selected: any) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value: any) => (
                  <Chip key={value} label={value} />
                ))}
              </Box>
            )
          : undefined,
        MenuProps: {
          ...props.SelectProps?.MenuProps,
          sx: {
            ...props.SelectProps?.MenuProps?.sx,
            '.MuiMenuItem-root': {
              whiteSpace: 'pre-wrap',
            },
          },
        },
      }}
      sx={{
        ...props.sx,
        '& .MuiSelect-select .notranslate::after': parameter?.placeholder
          ? {
              content: `"${parameter.placeholder}"`,
              opacity: 0.42,
            }
          : {},
        '& .MuiFormLabel-root:not(.MuiInputLabel-shrink) + .MuiInputBase-root > .MuiSelect-select .notranslate::after':
          {
            opacity: 0,
          },
      }}>
      {parameter?.options?.map((option) => (
        <MenuItem key={option.id} value={option.value || option.label}>
          {option.label || option.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default SelectField;
