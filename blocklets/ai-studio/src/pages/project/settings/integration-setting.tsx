import { useCurrentProject } from '@app/contexts/project';
import {
  generateProjectAgentSecret,
  generateProjectNPMPackageSecret,
  getAgentWebhookSecret,
  getProjectNPMPackageSecret,
} from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { LoadingButton } from '@blocklet/studio-ui';
import { Box, Button, CircularProgress, Link, Stack, Switch, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import usePromise from 'react-promise-suspense';
import { useParams } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { getFileIdFromPath } from '../../../utils/path';
import { useProjectState } from '../state';

function NpmIntegrationSetting() {
  const { projectId, projectRef } = useCurrentProject();
  const { t } = useLocaleContext();
  const loadedSecret = usePromise(() => getProjectNPMPackageSecret({ projectId }), []).secret;
  const { state } = useProjectState(projectId, projectRef);
  const hash = state.commits[0]?.oid;

  const [secret, setSecret] = useState(loadedSecret);

  const link = secret
    ? withQuery(joinURL(blocklet!.appUrl, blocklet!.prefix, '/api/projects', projectId, 'npm/package.tgz'), {
        secret,
        hash,
      })
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
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          mb: 0.5
        }}>
        {t('packageSetting')}
      </Typography>
      <Stack
        sx={{
          gap: 3,
          ml: 1
        }}>
        {(['npm', 'pnpm', 'yarn'] as const).map((manager) => {
          const prefix = manager === 'pnpm' ? 'pnpm install ' : manager === 'yarn' ? 'yarn add' : 'npm install';
          const cmd = link && `${prefix} "${link}"`;

          return <CopyLink key={manager} cmd={cmd} link={link} manager={manager} onGenerate={generateSecret} />;
        })}
      </Stack>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          mb: 0.5,
          mt: 3
        }}>
        AIGNE CLI
      </Typography>
      <Typography variant="caption">
        <Link href="https://github.com/AIGNE-io/aigne-framework/blob/main/docs/cli.md" target="_blank" sx={{ mx: 0.5 }}>
          AIGNE CLI
        </Link>
        {t('aigneCliTip')}
      </Typography>
      <CopyLink cmd={link ? `aigne run ${link}` : undefined} link={link} onGenerate={generateSecret} />
    </Box>
  );
}

function CopyLink({
  link,
  manager,
  cmd,
  onGenerate,
}: {
  link?: string;
  manager?: 'npm' | 'pnpm' | 'yarn';
  cmd?: string;
  onGenerate?: () => any;
}) {
  const { t } = useLocaleContext();

  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (cmd) {
      navigator.clipboard.writeText(cmd);
      setCopied(true);
    }
  };

  return (
    <Stack>
      <Typography variant="subtitle2" sx={{
        mb: 0.5
      }}>
        {manager}
      </Typography>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          gap: 1,
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          pl: 1
        }}>
        <Typography noWrap sx={{
          flex: 1
        }}>
          {cmd || (
            <Typography component="span" sx={{
              color: "text.disabled"
            }}>
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

function WebhookIntegrationSetting() {
  const { t } = useLocaleContext();

  const { projectId } = useCurrentProject();
  const { '*': filepath } = useParams();
  const agentId = filepath && getFileIdFromPath(filepath);

  const [loading, setLoading] = useState(false);

  const [state, setState] = useState<undefined | { apiSecret?: string; status?: 'disabled' | 'enabled' }>();

  const link = useMemo(() => {
    if (!agentId) return undefined;

    return state?.apiSecret && state?.status === 'enabled'
      ? withQuery(joinURL(blocklet!.appUrl, blocklet!.prefix, '/api/webhook/projects', projectId, 'agent', agentId), {
          secret: state.apiSecret,
        })
      : undefined;
  }, [agentId, state?.apiSecret, state?.status]);

  const generateSecret = async (enabled: boolean) => {
    if (!agentId) return;

    try {
      setLoading(true);
      const state = await generateProjectAgentSecret({ projectId, agentId, enabled });
      setState({ apiSecret: state?.apiSecret, status: state?.status });
    } catch (error) {
      Toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!agentId) return;

    getAgentWebhookSecret({ projectId, agentId }).then(setState);
  }, [projectId, agentId]);

  if (!agentId) return null;
  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 600,
          mb: 0.5
        }}>
        {t('webhookSetting')}
      </Typography>
      <Stack
        sx={{
          gap: 1,
          ml: 1
        }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center"
          }}>
          <Switch
            disabled={loading}
            checked={state?.status === 'enabled'}
            onChange={(e) => {
              generateSecret(e.target.checked);
            }}
          />
          {loading && <CircularProgress size={20} sx={{ ml: 1 }} />}
        </Box>

        {!loading && link && <CopyLink cmd={link} link={link} />}
      </Stack>
    </Box>
  );
}

export default function IntegrationSetting() {
  return (
    <Stack sx={{
      gap: 3
    }}>
      <NpmIntegrationSetting />
      <WebhookIntegrationSetting />
    </Stack>
  );
}
