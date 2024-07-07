import { TextField, TextFieldProps } from '@mui/material';
import { pick } from 'lodash';
import { KeyboardEvent, forwardRef, useCallback } from 'react';

import { StringParameter } from '../../types/assistant';

const StringField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: StringParameter;
    onChange: (value: string) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  const isQuestion = parameter?.key === 'question';

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isQuestion) return;

      // NOTE: Pressing Enter in the IME will trigger the 229 event
      if (e.keyCode === 229) return;
      if (e.key === 'Enter' && !e.shiftKey && !e.repeat) {
        e.preventDefault();
        (e.target as HTMLInputElement).form?.requestSubmit();
      }
    },
    [isQuestion]
  );

  return (
    <TextField
      ref={ref}
      {...pick(parameter, 'required', 'label', 'placeholder')}
      helperText={parameter?.helper}
      multiline={isQuestion || parameter?.multiline || isQuestion}
      minRows={isQuestion ? 1 : parameter?.multiline ? 2 : undefined}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      {...props}
      InputProps={{
        ...props.InputProps,
        inputProps: { ...props.inputProps, maxLength: parameter?.maxLength },
        readOnly,
      }}
    />
  );
});

export default StringField;
