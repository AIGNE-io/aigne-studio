import { getImageSize, getVideoSize, useUploader } from '@app/contexts/uploader';
import Avatar from '@arcblock/ux/lib/Avatar';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Box, Stack, Typography } from '@mui/material';

export default function LogoField({
  value = undefined,
  onChange = undefined,
}: {
  value?: { url: string; width?: number; height?: number };
  onChange?: (value: { url: string; width?: number; height?: number }) => void;
}) {
  const { t } = useLocaleContext();
  const uploaderRef = useUploader();

  return (
    <Stack
      sx={{ cursor: 'pointer', gap: 0.5 }}
      onClick={() => {
        const uploader = uploaderRef?.current?.getUploader();
        uploader?.open();

        uploader.onceUploadSuccess(async ({ response }: any) => {
          const url: string = response?.data?.url || response?.data?.fileUrl;

          let size: Awaited<ReturnType<typeof getImageSize> | ReturnType<typeof getVideoSize>> | undefined;

          if (url) {
            size = await getImageSize(url)
              .catch(() => getVideoSize(url))
              .catch(() => undefined);
          }

          onChange?.({ url, width: size?.naturalWidth, height: size?.naturalHeight });
        });
      }}>
      <Box component={Avatar} src={value?.url!} did={window.blocklet.appId} size={100} sx={{ borderRadius: 1 }} />
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
        }}>
        {t('clickToUploadAgentLogo')}
      </Typography>
    </Stack>
  );
}

export function AssetField({
  value = undefined,
  children = undefined,
  onChange = undefined,
}: {
  value?: { url: string; width?: number; height?: number };
  children?: React.ReactNode;
  onChange?: (value: { url: string; width?: number; height?: number }) => void;
}) {
  const uploaderRef = useUploader();

  return (
    <Stack
      sx={{ cursor: 'pointer', gap: 0.5 }}
      onClick={() => {
        const uploader = uploaderRef?.current?.getUploader();
        uploader?.open();

        uploader.onceUploadSuccess(async ({ response }: any) => {
          const url: string = response?.data?.url || response?.data?.fileUrl;

          let size: Awaited<ReturnType<typeof getImageSize> | ReturnType<typeof getVideoSize>> | undefined;

          if (url) {
            size = await getImageSize(url)
              .catch(() => getVideoSize(url))
              .catch(() => undefined);
          }

          onChange?.({ url, width: size?.naturalWidth, height: size?.naturalHeight });
        });
      }}>
      {children ?? (
        <Box component={Avatar} src={value?.url!} did={window.blocklet.appId} size={100} sx={{ borderRadius: 1 }} />
      )}
    </Stack>
  );
}
