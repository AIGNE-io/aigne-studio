import { FormControlLabel, Radio, RadioGroup, RadioGroupProps, alpha } from '@mui/material';
import { forwardRef } from 'react';

import { SelectParameter } from '../../../types';

const RadioField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: SelectParameter;
    onChange: (value: string) => void;
  } & Omit<RadioGroupProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  return (
    <RadioGroup ref={ref} row onChange={(e) => onChange(e.target.value)} {...props}>
      {parameter?.options?.map((option) => {
        const checked = option.value === props.value;

        return (
          <FormControlLabel
            label={option.label}
            disabled={readOnly}
            key={option.id}
            value={option.value}
            checked={checked}
            control={<Radio />}
            sx={{
              transition: 'all 0.3s linear',
              ml: 0,
              mr: 1,
              my: 0.5,
              py: 0.5,
              px: 2.5,
              border: 2,
              borderColor: (theme) => (checked ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.3)),
              borderRadius: 8,
              '.MuiRadio-root': {
                // hidden radio button
                display: 'none',
              },
            }}
          />
        );
      })}
    </RadioGroup>
  );
});

export default RadioField;
