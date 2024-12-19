import { useCurrentProject } from '@app/contexts/project';
import { generateProjectNPMPackageSecret, getProjectNPMPackageSecret } from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { LoadingButton } from '@blocklet/studio-ui';
import { Box, Button, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import usePromise from 'react-promise-suspense';
import { joinURL, withQuery } from 'ufo';

export default function IntegrationSetting() {
  const { projectId } = useCurrentProject();
  const { t } = useLocaleContext();

  const loadedSecret = usePromise(() => getProjectNPMPackageSecret({ projectId }), []).secret;

  const [secret, setSecret] = useState(loadedSecret);

  const link = secret
    ? withQuery(joinURL(blocklet!.appUrl, blocklet!.prefix, '/api/projects', projectId, 'npm/package.tgz'), { secret })
    : undefined;

  const generateSecret = async () => {
    try {
      const { secret } = await generateProjectNPMPackageSecret({ projectId });
      setSecret(secret);
    } catch (error) {
      Toast.error(error.message);
    }
  };

  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
    }
  };

  return (
    <Box>
      <Stack>
        <Typography variant="subtitle2" mb={0.5}>
          NPM
        </Typography>

        <Stack direction="row" alignItems="center" gap={1} border={1} borderColor="divider" borderRadius={1} pl={1}>
          <Typography flex={1} noWrap>
            {link || (
              <Typography component="span" color="text.disabled">
                {t('clickToGenerateNpmLink')}
              </Typography>
            )}
          </Typography>
          {!link ? (
            <LoadingButton variant="contained" onClick={generateSecret}>
              {t('generateObject', { object: t('link') })}
            </LoadingButton>
          ) : (
            <Button variant="contained" onClick={copyLink}>
              {copied ? t('copied') : t('copy')}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
}
