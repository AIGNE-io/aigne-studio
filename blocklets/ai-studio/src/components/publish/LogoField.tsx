import { useUploader } from '@app/contexts/uploader';
import PublishUpload from '@app/pages/project/icons/publish-upload';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, IconButton, Typography } from '@mui/material';

export default function LogoField({
  assistant,
  setRelease,
}: {
  assistant: AssistantYjs;
  setRelease: (update: (release: NonNullable<AssistantYjs['release']>) => void) => void;
}) {
  const { t } = useLocaleContext();
  const uploaderRef = useUploader();

  return (
    <Box>
      <Typography mb={0.5} variant="subtitle2">
        {t('publish.logo')}
      </Typography>

      <Box mb={0.5}>
        <Box
          onClick={() => {
            // @ts-ignore
            const uploader = uploaderRef?.current?.getUploader();

            uploader?.open();

            uploader.onceUploadSuccess((data: any) => {
              const { response } = data;
              const url = response?.data?.url || response?.data?.fileUrl;
              setRelease((release) => (release.logo = url));
            });
          }}>
          {assistant.release?.logo ? (
            <Box
              component="img"
              src={assistant.release.logo}
              alt=""
              sx={{ width: 100, height: 100, borderRadius: 1, cursor: 'pointer' }}
            />
          ) : (
            <Box width={1} display="flex" gap={1.5}>
              <IconButton
                key="uploader-trigger"
                size="small"
                sx={{ borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.06)', width: 100, height: 100 }}>
                <PublishUpload sx={{ fontSize: 100 }} />
              </IconButton>

              <Typography variant="subtitle3">Supported file formats include PNG, JPG, and SVG.</Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
