import { AI_RUNTIME_COMPONENTS_COMPONENT_DID } from '@app/libs/constants';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
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
import { joinURL, withQuery } from 'ufo';

export default function PublishView({
  projectId,
  projectRef,
  assistant,
}: {
  projectId: string;
  projectRef: string;
  assistant: AssistantYjs;
}) {
  return (
    <Suspense fallback={<CircularProgress />}>
      <ComponentInstaller
        did={[
          'z2qa6fvjmjew4pWJyTsKaWFuNoMUMyXDh5A1D',
          'z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk',
          'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o',
        ]}>
        <PublishViewContent projectId={projectId} projectRef={projectRef} assistant={assistant} />
      </ComponentInstaller>
    </Suspense>
  );
}

function PublishViewContent({
  projectId,
  projectRef,
  assistant,
}: {
  projectId: string;
  projectRef: string;
  assistant: AssistantYjs;
}) {
  const { t } = useLocaleContext();

  const previewUrl = useMemo(() => {
    const pagesPrefix = blocklet?.componentMountPoints.find((i) => i.name === 'pages-kit')?.mountPoint || '/';
    return withQuery(
      joinURL(globalThis.location.origin, pagesPrefix, `@${AI_RUNTIME_COMPONENTS_COMPONENT_DID}`, '/ai/runtime'),
      {
        aid: stringifyIdentity({ projectId, projectRef, assistantId: assistant.id }),
        working: true,
      }
    );
  }, [assistant.id, projectId, projectRef]);

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
      <Stack gap={1} px={2} py={2} className="publish-container">
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

        <Box textAlign="center" className="qr-code">
          <Box
            component={QRCode}
            value={previewUrl}
            sx={{ display: 'block', width: 160, height: 160, p: 1, border: 1, borderRadius: 1, borderColor: 'divider' }}
          />
        </Box>
      </Stack>
    </Stack>
  );
}
