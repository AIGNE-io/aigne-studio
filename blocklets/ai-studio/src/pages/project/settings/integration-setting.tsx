import { useCurrentProject } from '@app/contexts/project';
import { generateProjectAgentSecret, getAgentWebhookSecret } from '@app/libs/project';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Box, Button, CircularProgress, Stack, Switch, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { joinURL, withQuery } from 'ufo';

import { getFileIdFromPath } from '../../../utils/path';

function CopyLink({ link = undefined, cmd = undefined }: { link?: string; cmd?: string }) {
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
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          pl: 1,
        }}>
        <Typography
          noWrap
          sx={{
            flex: 1,
          }}>
          {cmd}
        </Typography>
        {link && <Button onClick={copy}>{copied ? t('copied') : t('copy')}</Button>}
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
          mb: 0.5,
        }}>
        {t('webhookSetting')}
      </Typography>
      <Stack
        sx={{
          gap: 1,
          ml: 1,
        }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
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
    <Stack
      sx={{
        gap: 3,
      }}>
      <WebhookIntegrationSetting />
    </Stack>
  );
}
