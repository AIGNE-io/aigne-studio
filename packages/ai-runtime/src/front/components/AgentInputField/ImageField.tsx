import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import ImageIcon from '@mui/icons-material/Image';
import { Box, Button, IconButton, InputAdornment, Stack, TextFieldProps } from '@mui/material';
import { useRef } from 'react';

import { uploadImage } from '../../../api/ai-runtime/image';
import { useUploader } from '../../../context/uploader';
import { ImageParameter } from '../../../types';
import StringField from './StringField';

const MAX_IMAGE_FILES = window.blocklet?.preferences?.maxImageCount || 1;

export default function ImageField({
  parameter,
  ...props
}: {
  parameter: ImageParameter;
  onChange: (value: string | number | undefined | string[]) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { t } = useLocaleContext();
  const uploaderRef = useUploader();

  const list = (Array.isArray(props.value) ? props.value : [props.value]).filter(Boolean);

  const handleFiles = async (files: File[]) => {
    if (parameter.multiple) {
      if (list.length + files.length > MAX_IMAGE_FILES) {
        Toast.error(t('maxFilesLimit', { limit: MAX_IMAGE_FILES }));
        return;
      }
    }

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('images', file));

      const response = await uploadImage({ input: formData });
      props.onChange(
        parameter.multiple
          ? [...list, ...(response.uploads || []).map((i) => i.url)].filter(Boolean)
          : response.uploads[0]?.url || ''
      );
    } catch (error) {
      Toast.error(error.message);
    }
  };

  const onImageUpload = () => {
    if (parameter.multiple && list.length >= MAX_IMAGE_FILES) {
      Toast.error(t('maxFilesLimit', { limit: MAX_IMAGE_FILES }));
      return;
    }

    const uploader = uploaderRef?.current?.getUploader();
    if (parameter.multiple && uploader?.opts?.restrictions?.maxNumberOfFiles) {
      uploader.opts.restrictions.maxNumberOfFiles = MAX_IMAGE_FILES - list.length;
    }

    uploader?.open();
    uploader.on('complete', (result: { successful: { responseResult: { data: { url: string } } }[] }) => {
      const urls = result.successful?.map((item) => item.responseResult.data.url);
      props.onChange(parameter.multiple ? [...list, ...urls] : urls[0]);
    });
  };

  return (
    <>
      {!!parameter.multiple && !!list.length && (
        <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1}>
          {list.map((url, index) => (
            <Box key={url} position="relative" display="flex">
              <img
                src={url}
                alt={`Uploaded ${index + 1}`}
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
              />
              <Button
                size="small"
                sx={{ position: 'absolute', top: 0, right: 0, minWidth: 'unset', p: 0.5 }}
                onClick={() => {
                  const newUrls = list.filter((_: any, i: any) => i !== index);
                  props.onChange(newUrls);
                }}>
                <CancelIcon style={{ color: 'red' }} />
              </Button>
            </Box>
          ))}
        </Stack>
      )}

      <StringField
        {...({ parameter } as any)}
        size="small"
        {...props}
        multiline={false}
        disabled={parameter.multiple}
        value={parameter.multiple ? '' : props.value}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: -0.75 }}>
              <Stack direction="row" alignItems="center" gap={0}>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  ref={cameraInputRef}
                  onChange={(e) => handleFiles(Array.from(e.target.files || []))}
                />

                <IconButton
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={list.length >= MAX_IMAGE_FILES}
                  sx={{ display: { xs: 'block', md: 'none' } }}>
                  <CameraAltIcon sx={{ fontSize: 18 }} />
                </IconButton>

                <IconButton onClick={onImageUpload} disabled={list.length >= MAX_IMAGE_FILES}>
                  <ImageIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
            </InputAdornment>
          ),
        }}
      />
    </>
  );
}
