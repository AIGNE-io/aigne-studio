import PromiseLoadingButton from '@app/components/promise-loading-button';
import { useSessionContext } from '@app/contexts/session';
import { getProjectDataUrlInSpace } from '@app/libs/did-spaces';
import { getDefaultBranch } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { ReConnect, SpaceGateway, SpaceStatus } from '@blocklet/did-space-react';
import { SyncRounded } from '@mui/icons-material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Button, ButtonProps, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { useState } from 'react';

import { getErrorMessage } from '../../../libs/api';
import DidSpaces from '../icons/did-spaces';
import { isTheErrorShouldShowMergeConflict, useMergeConflictDialog } from '../save-button';
import { useProjectState } from '../state';

function GatewayAction({
  spaceGateway,
  spaceStatus,
  refresh,
  projectId,
}: {
  spaceGateway: SpaceGateway;
  spaceStatus: SpaceStatus;
  refresh: Function;
  projectId: string;
}) {
  const { t, locale } = useLocaleContext();
  const { session } = useSessionContext();
  const { state, sync } = useProjectState(projectId, getDefaultBranch());
  const { showMergeConflictDialog } = useMergeConflictDialog({ projectId });

  const showSync = spaceStatus === SpaceStatus.CONNECTED;
  const showReconnect = spaceStatus === SpaceStatus.DISCONNECTED;

  return (
    <>
      {/* 同步数据 */}
      {showSync && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <PromiseLoadingButton
            size="small"
            loadingPosition="start"
            startIcon={<SyncRounded />}
            onClick={async () => {
              try {
                await sync(projectId, 'didSpace');
                Toast.success(t('synced'));
              } catch (error) {
                if (isTheErrorShouldShowMergeConflict(error)) {
                  showMergeConflictDialog();
                  return;
                }
                Toast.error(getErrorMessage(error));
              } finally {
                refresh();
              }
            }}>
            {t('sync')}
          </PromiseLoadingButton>
          {state?.project?.didSpaceLastSyncedAt && (
            <Typography variant="caption" color="#9CA3AF">
              {/* @ts-ignore */}
              <RelativeTime locale={locale} value={state.project.didSpaceLastSyncedAt} />
            </Typography>
          )}
        </Stack>
      )}
      {/* 重新连接 */}
      {showReconnect && (
        <ReConnect
          variant="outlined"
          session={session}
          spaceDid={session.user?.didSpace?.did}
          spaceGatewayUrl={session.user?.didSpace?.url}
          onConnected={async () => {
            await refresh();
          }}
          onError={(error) => {
            console.error(error);
            Toast.error(getErrorMessage(error));
          }}
        />
      )}
      <MoreActions sx={{ minWidth: 32, padding: '2px 4px', ml: 2 }} spaceGateway={spaceGateway} projectId={projectId} />
    </>
  );
}

function MoreActions({
  spaceGateway,
  projectId,
  ...rest
}: { spaceGateway: SpaceGateway; projectId: string } & ButtonProps) {
  const { t } = useLocaleContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>, open: boolean) => {
    e.stopPropagation();
    e.preventDefault();
    setAnchorEl((open && e.currentTarget) || null);
  };

  return (
    <>
      <Button variant="outlined" size="small" onClick={(e) => handleOpen(e, true)} {...rest}>
        <MoreHorizIcon />
      </Button>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={(e) => handleOpen(e as React.MouseEvent<HTMLElement>, false)}>
        {/* 查看数据 */}
        <MenuItem
          onClick={async () => {
            try {
              window.open(await getProjectDataUrlInSpace(spaceGateway.endpoint, projectId));
            } catch (error) {
              console.error(error);
              Toast.error(getErrorMessage(error));
            }
          }}>
          <ListItemIcon style={{ minWidth: 24 }}>
            <DidSpaces />
          </ListItemIcon>
          <ListItemText>{t('viewData')}</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

export default GatewayAction;
