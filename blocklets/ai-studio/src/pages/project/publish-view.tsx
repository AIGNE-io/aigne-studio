import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import ComponentInstaller from '@blocklet/ui-react/lib/ComponentInstaller';
import { Icon } from '@iconify-icon/react';
import CopyIcon from '@iconify-icons/tabler/copy';
import ShareIcon from '@iconify-icons/tabler/device-desktop-share';
import {
  Box,
  Button,
  CircularProgress,
  Stack,
  Tooltip,
  accordionClasses,
  accordionSummaryClasses,
} from '@mui/material';
import { Suspense, useMemo, useState } from 'react';
import QRCode from 'react-qr-code';
import { joinURL } from 'ufo';

export default function PublishView({
  projectId,
  projectRef,
  deploymentId,
}: {
  projectId: string;
  projectRef: string;
  deploymentId: string;
}) {
  return (
    <Suspense fallback={<CircularProgress />}>
      <ComponentInstaller
        did={[
          'z2qa6fvjmjew4pWJyTsKaWFuNoMUMyXDh5A1D',
          'z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk',
          'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o',
        ]}>
        <PublishViewContent projectId={projectId} projectRef={projectRef} deploymentId={deploymentId} />
      </ComponentInstaller>
    </Suspense>
  );
}

function PublishViewContent({
  projectId,
  projectRef,
  deploymentId,
}: {
  projectId: string;
  projectRef: string;
  deploymentId: string;
}) {
  const { t } = useLocaleContext();

  const previewUrl = useMemo(() => {
    return joinURL(globalThis.location.origin, window.blocklet.prefix, '/apps', deploymentId);
  }, [deploymentId, projectId, projectRef]);

  const [copied, setCopied] = useState(false);

  return (
    <Stack
      sx={{
        [`.${accordionClasses.root}`]: {
          borderBottom: 1,
          borderColor: 'divider',

          [`.${accordionSummaryClasses.root}`]: {
            bgcolor: 'grey.100',
            position: 'sticky',
            top: 0,
            zIndex: 2,
          },
        },
      }}>
      <Stack
        className="publish-container"
        sx={{
          gap: 1,
          p: 1,
          flexDirection: { xs: 'column', md: 'row' }
        }}>
        <Stack
          sx={{
            gap: 1,
            flex: 1,
            justifyContent: "space-around"
          }}>
          <Button variant="outlined" href={previewUrl} target="_blank" endIcon={<Icon icon={ShareIcon} />}>
            {t('previewInNewTab')}
          </Button>

          <Tooltip title={copied ? t('copied') : undefined} placement="top" disableInteractive>
            <Button
              variant="outlined"
              endIcon={<Icon icon={copied ? 'copy-check' : CopyIcon} />}
              onClick={() => {
                navigator.clipboard.writeText(previewUrl);
                setCopied(true);
              }}>
              {t('copyPreviewUrl')}
            </Button>
          </Tooltip>
        </Stack>

        <Box className="qr-code" sx={{
          textAlign: "center"
        }}>
          <Box
            component={QRCode}
            value={previewUrl}
            sx={{ display: 'block', width: 80, height: 80, p: 1, border: 1, borderRadius: 1, borderColor: 'divider' }}
          />
        </Box>
      </Stack>
    </Stack>
  );
}
