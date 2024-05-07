import LoadingButton from '@app/components/loading/loading-button';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { isAssistant } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ArrowLeft from '@iconify-icons/tabler/chevron-left';
import FloppyIcon from '@iconify-icons/tabler/device-floppy';
import EyeBoltIcon from '@iconify-icons/tabler/eye-bolt';
import HistoryToggleIcon from '@iconify-icons/tabler/history-toggle';
import SettingsIcon from '@iconify-icons/tabler/settings-2';
import {
  Box,
  Button,
  CircularProgress,
  ClickAwayListener,
  Dialog,
  DialogContent,
  Divider,
  Grow,
  IconButton,
  Paper,
  Popper,
  Stack,
  Typography,
} from '@mui/material';
import { bindDialog, bindPopper, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import CommitsTip, { CommitListView } from '../../components/template-form/commits-tip';
import { getFileIdFromPath } from '../../utils/path';
import PublishView from './publish-view';
import SaveButton, { CommitForm, SaveButtonDialog } from './save-button';
import Settings from './settings';
import { useAssistantChangesState, useProjectState } from './state';
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
                    <Settings boxProps={{}} />
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
  const { projectId, ref: gitRef } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  return (
    <>
      <Divider sx={{ m: 0, p: 0 }} />

      <HistoryAction />

      <SaveAction />

      <SettingsAction />

      <Divider sx={{ m: 0, p: 0 }} />

      <PublishAction />
    </>
  );
}

function HistoryAction() {
  const { t } = useLocaleContext();
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  const dialogState = usePopupState({ variant: 'dialog' });
  const navigate = useNavigate();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');
  const {
    state: { loading, commits },
  } = useProjectState(projectId, gitRef);

  return (
    <>
      <Box
        className="center"
        justifyContent="flex-start"
        key="history"
        onClick={dialogState.open}
        sx={{ cursor: 'pointer' }}>
        <Box className="center">
          <Box component={Icon} icon={HistoryToggleIcon} mr={1} sx={{ fontSize: '15px !important' }} />
        </Box>
        <Typography className="center" fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {t('alert.history')}
        </Typography>
      </Box>

      <Dialog {...bindDialog(dialogState)} fullScreen hideBackdrop sx={{ mt: '65px' }} PaperProps={{ elevation: 0 }}>
        <DialogContent sx={{ p: '16px !important' }}>
          <Stack gap={2}>
            <Box>
              <Button
                sx={{ p: 0 }}
                onClick={dialogState.close}
                startIcon={<Box component={Icon} icon={ArrowLeft} sx={{ fontSize: 16 }} />}>
                {t('back')}
              </Button>
            </Box>

            <CommitListView
              listProps={{ sx: { p: 0 } }}
              loading={loading}
              selected={gitRef}
              commits={commits}
              onClick={(commit) => {
                navigate(joinURL('..', commit.oid), { state: { filepath } });
                dialogState.close();
              }}
            />
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SaveAction() {
  const { t } = useLocaleContext();
  const { projectId, ref: gitRef } = useParams();
  const dialogState = usePopupState({ variant: 'dialog' });
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const [loading, setLoading] = useState(false);
  const { disabled } = useAssistantChangesState(projectId, gitRef);
  const form = useForm<CommitForm>({});
  const submitting = form.formState.isSubmitting || loading;

  return (
    <>
      <Box className="center" justifyContent="flex-start">
        <IconButton
          {...bindTrigger(dialogState)}
          disabled={submitting || disabled}
          sx={{
            position: 'relative',
            minWidth: 0,
            minHeight: 0,
            border: '0',
            p: 0,
            '&.Mui-disabled': {
              '.text': {
                color: 'rgba(0, 0, 0, 0.26) !important',
              },
            },
          }}>
          <Box className="center">
            <Box component={Icon} icon={FloppyIcon} mr={1} sx={{ fontSize: '15px !important' }} />
          </Box>
          <Typography className="center text" fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
            {t('save')}
          </Typography>
          {submitting && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <CircularProgress size={20} />
            </Box>
          )}
        </IconButton>
      </Box>

      <SaveButtonDialog
        projectId={projectId}
        gitRef={gitRef}
        dialogState={dialogState}
        setLoading={setLoading}
        form={form}
        dialogProps={{
          maxWidth: 'md',
          fullScreen: true,
          hideBackdrop: true,
          sx: {
            mt: '65px',
            '.MuiDialogTitle-root': {
              display: 'none',
            },
            '.MuiDialogContent-root': {
              padding: '16px !important',
              flex: 'none',
            },
            '.MuiDialogActions-root': {
              border: '0',
              py: 0,
            },
          },
          PaperProps: { elevation: 0 },
        }}
        dialogContent={
          <Button
            sx={{ mb: 2, p: 0 }}
            onClick={dialogState.close}
            startIcon={<Box component={Icon} icon={ArrowLeft} sx={{ fontSize: 16 }} />}>
            {t('back')}
          </Button>
        }
      />
    </>
  );
}

function SettingsAction() {
  const { t } = useLocaleContext();
  const { projectId, ref: gitRef } = useParams();
  const dialogState = usePopupState({ variant: 'dialog' });

  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  return (
    <>
      <Box
        className="center"
        justifyContent="flex-start"
        key="history"
        onClick={dialogState.open}
        sx={{ cursor: 'pointer' }}>
        <Box className="center">
          <Box component={Icon} icon={SettingsIcon} mr={1} sx={{ fontSize: '15px !important' }} />
        </Box>
        <Typography className="center" fontWeight={500} fontSize={16} lineHeight="28px" color="#030712">
          {t('setting')}
        </Typography>
      </Box>

      <Dialog {...bindDialog(dialogState)} fullScreen hideBackdrop sx={{ mt: '65px' }} PaperProps={{ elevation: 0 }}>
        <DialogContent sx={{ p: '16px !important' }}>
          <Stack gap={2}>
            <Box>
              <Button
                sx={{ p: 0 }}
                onClick={dialogState.close}
                startIcon={<Box component={Icon} icon={ArrowLeft} sx={{ fontSize: 16 }} />}>
                {t('back')}
              </Button>
            </Box>

            <Settings boxProps={{ sx: { '.setting-container': { p: 0 } } }} />
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PublishAction() {
  const { t } = useLocaleContext();
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  const dialogState = usePopupState({ variant: 'dialog' });

  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const { getFileById } = useProjectStore(projectId, gitRef, true);
  const fileId = filepath && getFileIdFromPath(filepath);
  const file = fileId && getFileById(fileId);

  return (
    <>
      <Box
        className="center"
        justifyContent="flex-start"
        key="history"
        onClick={dialogState.open}
        sx={{ cursor: 'pointer' }}>
        <LoadingButton
          sx={{ width: 1 }}
          variant="contained"
          startIcon={<Box component={Icon} icon={EyeBoltIcon} sx={{ fontSize: 16 }} />}
          size="small">
          {t('preview')}
        </LoadingButton>
      </Box>

      <Dialog {...bindDialog(dialogState)} fullScreen hideBackdrop sx={{ mt: '65px' }} PaperProps={{ elevation: 0 }}>
        <DialogContent>
          <Stack gap={2}>
            <Box>
              <Button
                sx={{ p: 0 }}
                onClick={dialogState.close}
                startIcon={<Box component={Icon} icon={ArrowLeft} sx={{ fontSize: 16 }} />}>
                {t('back')}
              </Button>
            </Box>

            <Box
              sx={{
                '.publish-container': {
                  p: 0,

                  '.qr-code': {
                    alignSelf: 'center',
                  },
                },
              }}>
              {file ? <PublishView projectId={projectId} projectRef={gitRef} assistant={file} /> : null}
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
