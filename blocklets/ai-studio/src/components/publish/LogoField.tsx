import { useUploader } from '@app/contexts/uploader';
import Avatar from '@arcblock/ux/lib/Avatar';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, Stack, Typography } from '@mui/material';

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
        {t('agentLogo')}
      </Typography>

      <Stack
        sx={{ cursor: 'pointer', gap: 0.5 }}
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
        <Box
          component={Avatar}
          src={assistant.release?.logo}
          did={window.blocklet.appId}
          size={100}
          sx={{ borderRadius: 1 }}
        />

        <Typography variant="caption" color="text.secondary">
          {t('clickToUploadAgentLogo')}
        </Typography>
      </Stack>
    </Box>
  );
}
