import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import ImageIcon from '@mui/icons-material/Image';
import { IconButton, InputAdornment, Stack, TextFieldProps } from '@mui/material';

import { useUploader } from '../../../context/uploader';
import { ImageParameter } from '../../../types';
import ImagePreviewItem from '../../runtime-components/AutoForm/image-preview-item';
import StringField from './StringField';

const MAX_IMAGE_FILES = window.blocklet?.preferences?.maxImageCount || 1;

export default function ImageField({
  parameter,
  ...props
}: {
  parameter: ImageParameter;
  onChange: (value: string | number | undefined | string[]) => void;
} & Omit<TextFieldProps, 'onChange'>) {
  const { t } = useLocaleContext();
  const uploaderRef = useUploader();

  const list = (Array.isArray(props.value) ? props.value : [props.value]).filter(Boolean);

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
      {list.length > 0 && (
        <Stack
          direction="row"
          sx={{
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1
          }}>
          {list.map((url, index) => (
            <ImagePreviewItem
              key={url}
              url={url}
              index={index}
              onRemove={(_, idx) => {
                const urls = list.filter((_, i) => i !== idx);
                props.onChange(urls);
              }}
            />
          ))}
        </Stack>
      )}
      <StringField
        {...({ parameter } as any)}
        size="small"
        {...props}
        multiline={false}
        value={parameter.multiple ? (props.value as string[]).join('; ') : props.value}
        InputProps={{
          readOnly: true,
          endAdornment: (
            <InputAdornment position="end" sx={{ mr: -0.75 }}>
              <IconButton onClick={onImageUpload} disabled={list.length >= MAX_IMAGE_FILES}>
                <ImageIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    </>
  );
}
