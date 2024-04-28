import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { isAssistant } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Box, Button, ClickAwayListener, Grow, Paper, Popper } from '@mui/material';
import { bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import CommitsTip from '../../components/template-form/commits-tip';
import { getFileIdFromPath } from '../../utils/path';
import PublishView from './publish-view';
import SaveButton from './save-button';
import Settings from './settings';
import { useProjectState } from './state';
import TokenUsage from './token-usage';
import { useProjectStore } from './yjs-state';

export default function HeaderActions() {
  const { t } = useLocaleContext();
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const navigate = useNavigate();
  const publishPopperState = usePopupState({ variant: 'popper', popupId: 'publish' });
  const settingPopperState = usePopupState({ variant: 'popper', popupId: 'settings' });

  const {
    state: { loading, commits },
  } = useProjectState(projectId, gitRef);
  const { getFileById } = useProjectStore(projectId, gitRef, true);

  const fileId = filepath && getFileIdFromPath(filepath);
  const file = fileId && getFileById(fileId);

  return (
    <Box gap={1} className="center">
      {file && isAssistant(file) && <TokenUsage assistant={file} />}

      <CommitsTip
        loading={loading}
        commits={commits}
        hash={gitRef}
        onCommitSelect={(commit) => {
          navigate(joinURL('..', commit.oid), { state: { filepath } });
        }}>
        <Button sx={{ minWidth: 0, minHeight: 0, width: 32, height: 32, border: '1px solid #E5E7EB' }}>
          <Box component={Icon} icon="tabler:history-toggle" sx={{ fontSize: 20, color: '#030712' }} />
        </Button>
      </CommitsTip>

      <SaveButton projectId={projectId} gitRef={gitRef} />

      <>
        <Button
          sx={{ minWidth: 0, minHeight: 0, width: 32, height: 32, border: '1px solid #E5E7EB' }}
          {...bindTrigger(settingPopperState)}>
          <Box component={Icon} icon="tabler:settings-2" sx={{ fontSize: 18, color: '#030712' }} />
        </Button>

        <Popper {...bindPopper(settingPopperState)} sx={{ zIndex: 1101 }} transition placement="bottom-end">
          {({ TransitionProps }) => (
            <Grow style={{ transformOrigin: 'right top' }} {...TransitionProps}>
              <Paper sx={{ border: '1px solid #ddd', maxWidth: 450, maxHeight: '80vh', overflow: 'auto', mt: 1 }}>
                <ClickAwayListener
                  onClickAway={(e) => (e.target as HTMLElement)?.localName !== 'body' && settingPopperState.close()}>
                  <Box>
                    <Settings />
                  </Box>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </>

      <>
        <Button
          variant="contained"
          startIcon={<Box component={Icon} icon="tabler:rocket" sx={{ fontSize: 16 }} />}
          size="small"
          {...bindTrigger(publishPopperState)}>
          {t('publish')}
        </Button>

        <Popper
          {...bindPopper(publishPopperState)}
          sx={{
            zIndex: 1101,
            maxWidth: 450,
            width: '100%',
          }}
          transition
          placement="bottom-end">
          {({ TransitionProps }) => (
            <Grow style={{ transformOrigin: 'right top' }} {...TransitionProps}>
              <Paper
                sx={{
                  border: '1px solid #ddd',
                  maxHeight: '80vh',
                  overflow: 'auto',
                  mt: 1,
                }}>
                <ClickAwayListener
                  onClickAway={(e) => (e.target as HTMLElement)?.localName !== 'body' && publishPopperState.close()}>
                  <Box>{file ? <PublishView projectId={projectId} projectRef={gitRef} assistant={file} /> : null}</Box>
                </ClickAwayListener>
              </Paper>
            </Grow>
          )}
        </Popper>
      </>
    </Box>
  );
}
