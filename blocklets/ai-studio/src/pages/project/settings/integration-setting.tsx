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

  return (
    <Box>
      <Stack gap={3}>
        {(['npm', 'pnpm', 'yarn'] as const).map((manager) => (
          <NpmLink key={manager} link={link} manager={manager} onGenerate={generateSecret} />
        ))}
      </Stack>
    </Box>
  );
}

function NpmLink({
  link,
  manager,
  onGenerate,
}: {
  link?: string;
  manager?: 'npm' | 'pnpm' | 'yarn';
  onGenerate: () => any;
}) {
  const { t } = useLocaleContext();

  const prefix = manager === 'pnpm' ? 'pnpm install ' : manager === 'yarn' ? 'yarn add' : 'npm install';
  const cmd = link && `${prefix} ${link}`;

  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (cmd) {
      navigator.clipboard.writeText(cmd);
      setCopied(true);
    }
  };

  return (
    <Stack>
      <Typography variant="subtitle2" mb={0.5}>
        {manager}
      </Typography>

      <Stack direction="row" alignItems="center" gap={1} border={1} borderColor="divider" borderRadius={1} pl={1}>
        <Typography flex={1} noWrap>
          {cmd || (
            <Typography component="span" color="text.disabled">
              {t('clickToGenerateNpmLink')}
            </Typography>
          )}
        </Typography>

        {!link ? (
          <LoadingButton onClick={onGenerate}>{t('generateObject', { object: t('link') })}</LoadingButton>
        ) : (
          <Button onClick={copy}>{copied ? t('copied') : t('copy')}</Button>
        )}
      </Stack>
    </Stack>
  );
}
