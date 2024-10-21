import AttachFileIcon from '@mui/icons-material/AttachFile';
import { IconButton, InputAdornment, Stack, TextField, TextFieldProps } from '@mui/material';
import { pick } from 'lodash';
import { forwardRef } from 'react';

import { useUploader } from '../../context/uploader';
import { StringParameter } from '../../types/assistant';

const ImageField = forwardRef<
  HTMLDivElement,
  {
    readOnly?: boolean;
    parameter?: StringParameter;
    onChange: (value: string) => void;
  } & Omit<TextFieldProps, 'onChange'>
>(({ readOnly, parameter, onChange, ...props }, ref) => {
  const uploaderRef = useUploader();

  return (
    <TextField
      ref={ref}
      {...pick(parameter, 'required', 'label', 'placeholder')}
      helperText={parameter?.helper}
      onChange={(e) => onChange(e.target.value)}
      {...props}
      InputProps={{
        ...props.InputProps,
        inputProps: { ...props.inputProps, maxLength: parameter?.maxLength },
        readOnly,
        endAdornment: (
          <InputAdornment position="end" sx={{ mr: -0.75 }}>
            <Stack direction="row" alignItems="center" gap={1}>
              <IconButton
                onClick={() => {
                  const uploader = uploaderRef?.current?.getUploader();
                  uploader?.open();
                  uploader.onceUploadSuccess(({ response }: any) => {
                    const url = response?.data?.url || response?.data?.fileUrl;
                    onChange(url);
                  });
                }}>
                <AttachFileIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          </InputAdornment>
        ),
      }}
    />
  );
});

export default ImageField;
