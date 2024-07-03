import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { getMessageById } from '@blocklet/aigne-sdk/api/message';
import { CurrentAgentProvider, CurrentMessageProvider } from '@blocklet/pages-kit/builtin/async/ai-runtime';
import { getAgent } from '@blocklet/pages-kit/builtin/async/ai-runtime/api/agent';
import { DEFAULT_OUTPUT_COMPONENT_ID } from '@blocklet/pages-kit/builtin/async/ai-runtime/constants';
import RuntimeProvider from '@blocklet/pages-kit/builtin/async/ai-runtime/contexts/Runtime';
import { useLocaleContext } from '@blocklet/pages-kit/builtin/locale';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import { Box, Button, CircularProgress, Theme, useMediaQuery } from '@mui/material';
import { useRequest, useUpdateEffect } from 'ahooks';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

export default function MessagePage() {
  const { id } = useParams();
  if (!id) throw new Error('Missing required param `messageId`');

  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));
  const { t } = useLocaleContext();

  const { data: message, loading, error } = useRequest(() => getMessageById({ messageId: id }));
  if (error) throw error;

  const { blockletDid } = message || { blockletDid: '' };

  const {
    run: fetchAgent,
    loading: agentLoading,
    data: agent,
    error: agentError,
  } = useRequest(getAgent, {
    manual: true,
    onError: (error) => {
      throw error;
    },
  });

  if (agentError) throw agentError;

  const { projectId, agentId } = message || {};
  let aid: string | undefined;
  if (projectId && agentId) {
    aid = stringifyIdentity({ projectId, agentId });
  }

  useUpdateEffect(() => {
    if (aid) {
      fetchAgent({ aid, working: false });
    }
  }, [aid, fetchAgent]);

  const appearanceOutput = useMemo(() => {
    const appearance = agent?.outputVariables?.find(
      (i) => i.name === RuntimeOutputVariable.appearanceOutput
    )?.appearance;
    if (appearance?.componentId) return appearance;

    return {
      componentId: DEFAULT_OUTPUT_COMPONENT_ID,
    };
  }, [agent]);

  const handleClick = () => {
    const idx = window.location.href.indexOf('/messages/');
    window.open(joinURL(window.location.href.slice(0, idx), '/preview', `/${aid}`), '_blank');
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
      {message && appearanceOutput.componentId && aid ? (
        <Box sx={{ width: isMobile ? '80vw' : '60vw' }}>
          <RuntimeProvider blockletDid={blockletDid} aid={aid}>
            <CurrentAgentProvider agentId={message.agentId}>
              <CurrentMessageProvider message={message}>
                <CustomComponentRenderer
                  componentId={appearanceOutput.componentId}
                  props={{
                    blockletDid,
                    aid,
                    working: false,
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
                onClick={handleClick}
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
      ) : loading || agentLoading ? (
        <Box textAlign="center" my={10}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        ''
      )}
    </Box>
  );
}
