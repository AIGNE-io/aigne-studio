import LoadingButton from '@app/components/loading/loading-button';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { isAssistant } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import FloppyIcon from '@iconify-icons/tabler/device-floppy';
import EyeBoltIcon from '@iconify-icons/tabler/eye-bolt';
import HistoryToggleIcon from '@iconify-icons/tabler/history-toggle';
import SettingsIcon from '@iconify-icons/tabler/settings-2';
import {
  Box,
  Button,
  ClickAwayListener,
  Dialog,
  DialogContent,
  Divider,
  Grow,
  Paper,
  Popper,
  Typography,
} from '@mui/material';
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

export function AgentTokenUsage() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { getFileById } = useProjectStore(projectId, gitRef, true);

  const fileId = filepath && getFileIdFromPath(filepath);
  const file = fileId && getFileById(fileId);

  if (file && isAssistant(file)) {
    return <TokenUsage assistant={file} />;
  }

  return null;
}

export function HeaderActions() {
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
      <AgentTokenUsage />

      <CommitsTip
        loading={loading}
        commits={commits}
        hash={gitRef}
        onCommitSelect={(commit) => {
          navigate(joinURL('..', commit.oid), { state: { filepath } });
        }}>
        <Button sx={{ minWidth: 0, minHeight: 0, width: 32, height: 32, border: '1px solid #E5E7EB' }}>
          <Box component={Icon} icon={HistoryToggleIcon} sx={{ fontSize: 20, color: '#030712' }} />
        </Button>
      </CommitsTip>

      <SaveButton projectId={projectId} gitRef={gitRef} />

      <>
        <Button
          sx={{ minWidth: 0, minHeight: 0, width: 32, height: 32, border: '1px solid #E5E7EB' }}
          {...bindTrigger(settingPopperState)}>
          <Box component={Icon} icon={SettingsIcon} sx={{ fontSize: 18, color: '#030712' }} />
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
        <LoadingButton
          variant="contained"
          startIcon={<Box component={Icon} icon={EyeBoltIcon} sx={{ fontSize: 16 }} />}
          size="small"
          {...bindTrigger(publishPopperState)}>
          {t('preview')}
        </LoadingButton>

        <Popper {...bindPopper(publishPopperState)} sx={{ zIndex: 1101 }} transition placement="bottom-end">
          {({ TransitionProps }) => (
            <Grow style={{ transformOrigin: 'right top' }} {...TransitionProps}>
              <Paper
                sx={{
                  border: '1px solid #ddd',
                  height: '100%',
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

export function MobileHeaderActions() {
  const { t } = useLocaleContext();
  const { projectId, ref: gitRef } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  return (
    <>
      <Divider sx={{ m: 0, p: 0 }} />

      <Box className="center" justifyContent="flex-start" key="history">
        <Box className="center">
          <Box component={Icon} icon={HistoryToggleIcon} size={15} mr={1} />
        </Box>
        <Typography className="center" fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {t('history')}
        </Typography>
      </Box>

      <Box className="center" justifyContent="flex-start" key="history">
        <Box className="center">
          <Box component={Icon} icon={FloppyIcon} size={15} mr={1} />
        </Box>
        <Typography className="center" fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {t('save')}
        </Typography>
      </Box>

      <Box className="center" justifyContent="flex-start" key="history">
        <Box className="center">
          <Box component={Icon} icon={SettingsIcon} size={15} mr={1} />
        </Box>
        <Typography className="center" fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {t('setting')}
        </Typography>
      </Box>

      <Divider sx={{ m: 0, p: 0 }} />

      <LoadingButton
        variant="contained"
        startIcon={<Box component={Icon} icon={EyeBoltIcon} sx={{ fontSize: 16 }} />}
        size="small">
        {t('preview')}
      </LoadingButton>

      <Dialog fullScreen open hideBackdrop sx={{ mt: '65px' }} PaperProps={{ elevation: 0 }}>
        <DialogContent>1</DialogContent>
      </Dialog>
    </>
  );
}
