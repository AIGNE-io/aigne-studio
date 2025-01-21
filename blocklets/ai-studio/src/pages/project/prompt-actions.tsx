import { CurrentProjectProvider } from '@app/contexts/project';
import { useSessionContext } from '@app/contexts/session';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { isAssistant } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ArrowLeft from '@iconify-icons/tabler/chevron-left';
import FloppyIcon from '@iconify-icons/tabler/device-floppy';
import HistoryToggleIcon from '@iconify-icons/tabler/history-toggle';
import SettingsIcon from '@iconify-icons/tabler/settings-2';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  Divider,
  Drawer,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { bindDialog, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { joinURL } from 'ufo';

import CommitsTip, { CommitListView } from '../../components/template-form/commits-tip';
import { getFileIdFromPath } from '../../utils/path';
import DeploymentAction from './deployment-action';
import type { CommitForm } from './save-button';
import SaveButton, { SaveButtonDialog } from './save-button';
import Settings from './settings';
import { useAssistantChangesState, useProjectState } from './state';
import TokenUsage from './token-usage';
import WsStatus from './ws-status';
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
  const { session } = useSessionContext();
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');

  const navigate = useNavigate();

  const {
    state: { loading, commits },
  } = useProjectState(projectId, gitRef);

  const fileId = filepath && getFileIdFromPath(filepath);

  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = async () => {
    // @note: 刷新 session 以实时获取 did spaces 最新的绑定状态
    if (!drawerOpen) {
      await session.refresh();
    }
    setDrawerOpen(!drawerOpen);
  };

  const disabledButton = useMemo(() => {
    if (commits && commits.length > 2 && commits[0]?.oid !== gitRef) {
      return false;
    }

    return undefined;
  }, [commits, gitRef]);

  return (
    <CurrentProjectProvider projectId={projectId} projectRef={gitRef}>
      <Box gap={1} className="center" sx={{ button: { whiteSpace: 'nowrap' } }}>
        <WsStatus projectId={projectId} gitRef={gitRef} />

        <AgentTokenUsage />

        <CommitsTip
          loading={loading}
          commits={commits}
          hash={gitRef}
          onCommitSelect={(commit) => {
            navigate(joinURL('..', commit.oid), { state: { filepath } });
          }}>
          <span>
            <Tooltip disableInteractive title={t('alert.history')}>
              <Button sx={{ minWidth: 0, minHeight: 0, width: 32, height: 32, border: '1px solid #E5E7EB' }}>
                <Box component={Icon} icon={HistoryToggleIcon} sx={{ fontSize: 20, color: '#030712' }} />
              </Button>
            </Tooltip>
          </span>
        </CommitsTip>

        <SaveButton projectId={projectId} gitRef={gitRef} disabled={disabledButton} />

        <>
          <Tooltip disableInteractive title={t('setting')}>
            <Button
              data-testid="header-actions-setting"
              sx={{ minWidth: 32, minHeight: 0, width: 32, height: 32, border: '1px solid #E5E7EB' }}
              onClick={toggleDrawer}>
              <Box component={Icon} icon={SettingsIcon} sx={{ fontSize: 18, color: '#030712' }} />
            </Button>
          </Tooltip>

          <Drawer anchor="right" open={drawerOpen} onClose={toggleDrawer} disableEnforceFocus>
            <Settings boxProps={{ width: 500 }} onClose={toggleDrawer} />
          </Drawer>
        </>

        {projectId && gitRef && fileId && <DeploymentAction />}
      </Box>
    </CurrentProjectProvider>
  );
}

export function MobileHeaderActions() {
  const { projectId, ref: gitRef, '*': filepath } = useParams();
  if (!projectId || !gitRef) throw new Error('Missing required params `projectId` or `ref`');
  const fileId = filepath && getFileIdFromPath(filepath);

  return (
    <CurrentProjectProvider projectId={projectId} projectRef={gitRef}>
      <Divider sx={{ m: 0, p: 0 }} />

      <HistoryAction />

      <SaveAction />

      <SettingsAction />

      <Divider sx={{ m: 0, p: 0 }} />

      {projectId && gitRef && fileId && <DeploymentAction />}
    </CurrentProjectProvider>
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

  const [githubLoading, setGithubLoading] = useState(false);
  const [didSpaceLoading, setDidSpaceLoading] = useState(false);

  const { disabled } = useAssistantChangesState(projectId, gitRef);
  const form = useForm<CommitForm>({});
  const submitting = form.formState.isSubmitting || githubLoading || didSpaceLoading;

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
            width: '100%',
            display: 'flex',
            justifyContent: 'flex-start',
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
        setGithubLoading={setGithubLoading}
        setDidSpaceLoading={setDidSpaceLoading}
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

      <Dialog
        {...bindDialog(dialogState)}
        fullScreen
        hideBackdrop
        sx={{ mt: '65px' }}
        PaperProps={{ elevation: 0 }}
        disableEnforceFocus>
        <DialogContent sx={{ p: '16px !important' }}>
          <Stack gap={2}>
            <Box>
              <Button
                sx={{ p: 0 }}
                onClick={dialogState.close}
                startIcon={<Box component={Icon} icon={ArrowLeft} sx={{ fontSize: 16 }} />}>
                {t('close')}
              </Button>
            </Box>

            <Settings boxProps={{ sx: { '.setting-container': { p: 0 } } }} />
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
