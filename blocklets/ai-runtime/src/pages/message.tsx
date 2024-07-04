import { useComponent } from '@app/contexts/component';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { getAgent } from '@blocklet/aigne-sdk/api/agent';
import { getMessageById } from '@blocklet/aigne-sdk/api/message';
import { CurrentAgentProvider, CurrentMessageProvider, RuntimeProvider } from '@blocklet/aigne-sdk/components';
import { Result } from '@blocklet/pages-kit/builtin/arcblock/ux';
import { DEFAULT_OUTPUT_COMPONENT_ID } from '@blocklet/pages-kit/builtin/async/ai-runtime/constants';
import { useLocaleContext } from '@blocklet/pages-kit/builtin/locale';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import { Box, Button, CircularProgress, Theme, useMediaQuery } from '@mui/material';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export default function MessagePage() {
  const { messageId } = useParams();
  if (!messageId) throw new Error('Missing required param `messageId`');

  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));
  const { t } = useLocaleContext();

  const { data: message, loading: messageLoading, error } = useRequest(() => getMessageById({ messageId }));
  if (error) throw error;

  const blockletDid = message?.blockletDid;

  const { projectId, agentId, projectRef } = message || {};

  let aid: string | undefined;
  if (projectId && agentId) {
    aid = stringifyIdentity({ projectId, agentId, projectRef });
  }

  const {
    loading: agentLoading,
    data: agent,
    error: agentError,
  } = useRequest(getAgent, {
    ready: !!(projectId && agentId && aid),
    defaultParams: [
      {
        aid: aid as string,
        working: true,
        blockletDid,
      },
    ],
  });

  if (agentError) throw agentError;

  const appearanceOutput = useMemo(() => {
    const appearance = agent?.outputVariables?.find(
      (i) => i.name === RuntimeOutputVariable.appearanceOutput
    )?.appearance;
    if (appearance?.componentId) return appearance;

    return {
      componentId: DEFAULT_OUTPUT_COMPONENT_ID,
    };
  }, [agent]);

  const resourceBlocklet = useComponent(blockletDid);
  const aigneRuntime = useComponent(AIGNE_RUNTIME_COMPONENT_DID);

  const chatUrl = blockletDid ? `${resourceBlocklet?.mountPoint}` : `${aigneRuntime?.mountPoint}/preview/${aid}`;

  const loaded = agent && message;
  const loading = messageLoading || agentLoading;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
      {loaded ? (
        <Box sx={{ width: isMobile ? '80vw' : '60vw' }}>
          <RuntimeProvider blockletDid={blockletDid} aid={aid as string} working>
            <CurrentAgentProvider agentId={agentId as string}>
              <CurrentMessageProvider message={message}>
                <CustomComponentRenderer
                  componentId={appearanceOutput.componentId as string}
                  props={{
                    blockletDid,
                    aid,
                    working: true,
                  }}
                />
              </CurrentMessageProvider>
            </CurrentAgentProvider>
          </RuntimeProvider>
          <Box
            sx={{
              position: 'sticky',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              backdropFilter: 'blur(5px)',
              zIndex: 10,
              bottom: 0,
            }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                mt: 5,
                padding: 2,
              }}>
              <Button
                size="large"
                variant="contained"
                href={chatUrl}
                target="_blank"
                sx={{
                  background: agent?.project?.appearance?.primaryColor || '#030712',
                  '&:hover': {
                    background: agent?.project?.appearance?.primaryColor || '#030712',
                  },
                }}>
                {`${t('openTheBot')} ${agent?.project.name}`}
              </Button>
            </Box>
          </Box>
        </Box>
      ) : loading ? (
        <Box textAlign="center" my={10}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box component={Result} status={404} sx={{ bgcolor: 'transparent', my: 10 }} />
      )}
    </Box>
  );
}
