import { useComponent } from '@app/contexts/component';
import { AIGNE_RUNTIME_COMPONENT_DID } from '@blocklet/ai-runtime/constants';
import { RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { getAgent } from '@blocklet/aigne-sdk/api/agent';
import { getMessageById } from '@blocklet/aigne-sdk/api/message';
import {
  CurrentAgentProvider,
  CurrentMessageProvider,
  RuntimeProvider,
  getDefaultOutputComponent,
} from '@blocklet/aigne-sdk/components/ai-runtime';
import { Result } from '@blocklet/pages-kit/builtin/arcblock/ux';
import { useLocaleContext } from '@blocklet/pages-kit/builtin/locale';
import { CustomComponentRenderer } from '@blocklet/pages-kit/components';
import { Box, Button, Theme, useMediaQuery } from '@mui/material';
import { useMemo } from 'react';
import usePromise from 'react-promise-suspense';
import { useParams } from 'react-router-dom';
import { getQuery } from 'ufo';

export default function MessagePage() {
  const { messageId } = useParams();
  if (!messageId) throw new Error('Missing required param `messageId`');

  const { t } = useLocaleContext();

  const isMobile = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));

  const message = usePromise(getMessageById, [{ messageId }]);

  const { aid, blockletDid } = message;

  const agent = usePromise(getAgent, [{ aid }]);

  const appearanceOutput = useMemo(() => {
    const appearance = agent?.outputVariables?.find(
      (i) => i.name === RuntimeOutputVariable.appearanceOutput
    )?.appearance;
    if (appearance?.componentId) return appearance;

    return {
      componentId: getDefaultOutputComponent({ name: RuntimeOutputVariable.appearanceOutput })?.componentId,
    };
  }, [agent]);

  const resourceBlocklet = useComponent(blockletDid);
  const aigneRuntime = useComponent(AIGNE_RUNTIME_COMPONENT_DID);

  const chatUrl =
    (getQuery(window.location.href).agentUrl as string) ||
    (blockletDid ? resourceBlocklet?.mountPoint : aigneRuntime && `${aigneRuntime.mountPoint}/preview/${aid}`);

  const loaded = agent && message;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
      {loaded ? (
        <Box sx={{ width: isMobile ? '80vw' : '60vw' }}>
          <RuntimeProvider aid={aid} working>
            <CurrentAgentProvider aid={aid}>
              <CurrentMessageProvider message={message}>
                <CustomComponentRenderer
                  componentId={appearanceOutput.componentId as string}
                  props={{ blockletDid, aid, working: true }}
                  properties={appearanceOutput.componentProperties}
                />
              </CurrentMessageProvider>
            </CurrentAgentProvider>
          </RuntimeProvider>
          {chatUrl && (
            <Box
              sx={{
                position: 'sticky',
                backgroundColor: 'grey.500',
                backdropFilter: 'blur(5px)',
                '@supports not ((backdrop-filter: blur(5px)) or (-webkit-backdrop-filter: blur(5px)))': {
                  bgcolor: (theme) => theme.palette.background.paper,
                },
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
                    background: agent?.project?.appearance?.primaryColor || 'primary.main',
                    '&:hover': {
                      background: agent?.project?.appearance?.primaryColor || 'primary.main',
                    },
                  }}>
                  {`${t('openTheBot')} ${agent?.project.name}`}
                </Button>
              </Box>
            </Box>
          )}
        </Box>
      ) : (
        <Box component={Result} status={404} sx={{ bgcolor: 'transparent', my: 10 }} />
      )}
    </Box>
  );
}
