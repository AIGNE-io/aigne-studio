import { useCurrentGitStore } from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import ArrowLeftIcon from '@iconify-icons/tabler/arrow-bear-left-2';
import ArrowRightIcon from '@iconify-icons/tabler/arrow-ramp-right';
import CheckIcon from '@iconify-icons/tabler/check';
import ArrowDownIcon from '@iconify-icons/tabler/chevron-down';
import PencilIcon from '@iconify-icons/tabler/pencil';
import TrashIcon from '@iconify-icons/tabler/trash';
import { Box, Divider, MenuItem, MenuList, Stack, TextField, Typography, alpha, tooltipClasses } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import Dropdown from '../../components/template-form/dropdown';
import { getErrorMessage } from '../../libs/api';
import useDialog from '../../utils/use-dialog';
import Floppy from './icons/floppy';
import { useProjectState } from './state';

export default function BranchButton({
  projectId,
  gitRef,
  filepath = undefined,
}: {
  projectId: string;
  gitRef: string;
  filepath?: string;
}) {
  const { t } = useLocaleContext();

  const navigate = useNavigate();

  const { createBranch } = useProjectState(projectId, gitRef);

  const setProjectCurrentBranch = useCurrentGitStore((i) => i.setProjectCurrentBranch);

  const { dialog, showDialog, closeDialog } = useDialog();
  const { dialog: createBranchDialog, showDialog: createShowDialog } = useDialog();
  const getDefaultBranch = useCurrentGitStore((i) => i.getCurrentDefaultBranch);
  const { updateBranch, deleteBranch } = useProjectState(projectId, gitRef);

  return (
    <>
      {dialog}
      {createBranchDialog}
      <Dropdown
        placement="bottom-start"
        sx={{
          [`.${tooltipClasses.tooltip}`]: {
            minWidth: 200,
            maxHeight: '60vh',
            overflow: 'auto',
          },
        }}
        dropdown={
          <BranchList
            projectId={projectId}
            _ref={gitRef}
            isDefault={gitRef === getDefaultBranch()}
            onItemClick={(branch) => {
              setProjectCurrentBranch(projectId, branch);
              return branch !== gitRef && navigate(joinURL('..', projectId, 'file', branch), { state: { filepath } });
            }}
            onCreate={() => {
              let data: { new: string; source: string };

              createShowDialog({
                maxWidth: 'sm',
                fullWidth: true,
                title: <Box className="between">{t('newObject', { object: t('branch') })}</Box>,
                content: <CreateBranch projectId={projectId} _ref={gitRef} onChange={(_data) => (data = _data)} />,
                cancelText: t('cancel'),
                okIcon: <Floppy />,
                okText: t('save'),
                onOk: async () => {
                  try {
                    if (!data.new) {
                      throw new Error(t('alert.newBranchRequired'));
                    }

                    await createBranch({ projectId, input: { name: data.new, oid: data.source } });
                    setProjectCurrentBranch(projectId, data.new);

                    Toast.success(t('alert.branchCreated'));
                    closeDialog();

                    navigate(joinURL('..', projectId, 'file', gitRef), { state: { filepath } });
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                  }
                },
              });
            }}
            onDelete={() => {
              showDialog({
                formSx: {
                  '.MuiDialogTitle-root': {
                    border: 0,
                  },
                  '.MuiDialogActions-root': {
                    border: 0,
                  },
                  '.save': {
                    bgcolor: 'error.main',
                  },
                },
                maxWidth: 'sm',
                fullWidth: true,
                title: (
                  <Box data-testid="project-delete-title" sx={{ wordWrap: 'break-word' }}>
                    {t('alert.deleteBranch', { branch: gitRef })}
                  </Box>
                ),
                content: (
                  <Box>
                    <Typography
                      sx={{
                        fontWeight: 500,
                        fontSize: 16,
                        lineHeight: '28px',
                        color: 'text.secondary',
                      }}>
                      This will permanently delete this branch
                    </Typography>
                  </Box>
                ),
                okText: t('alert.delete'),
                okColor: 'error',
                cancelText: t('cancel'),
                onOk: async () => {
                  try {
                    await deleteBranch({ projectId, branch: gitRef });
                    setProjectCurrentBranch(projectId, getDefaultBranch());

                    navigate(joinURL('..', projectId, 'file', getDefaultBranch()), { state: { filepath } });
                    Toast.success(t('alert.deleted'));
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                  }
                },
              });
            }}
            onRename={() => {
              let newName = gitRef;

              showDialog({
                maxWidth: 'sm',
                fullWidth: true,
                title: <Box sx={{ wordWrap: 'break-word' }}>{t('rename')}</Box>,
                content: (
                  <Stack>
                    <Box>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          mb: 0.5,
                        }}>
                        {t('branchName')}
                      </Typography>
                      <TextField
                        autoFocus
                        label={t('branchName')}
                        fullWidth
                        defaultValue={gitRef}
                        onChange={(e) => (newName = e.target.value)}
                      />
                    </Box>
                  </Stack>
                ),
                okText: t('save'),
                cancelText: t('cancel'),
                onOk: async () => {
                  try {
                    await updateBranch({ projectId, branch: gitRef, input: { name: newName } }).then(() => {
                      setProjectCurrentBranch(projectId, newName);
                      navigate(joinURL('..', projectId, 'file', newName), { state: { filepath } });
                    });

                    Toast.success(t('alert.deleted'));
                  } catch (error) {
                    Toast.error(getErrorMessage(error));
                  }
                },
              });
            }}
          />
        }>
        <Stack
          className="center"
          data-testid="branch-icon"
          sx={{
            flexDirection: 'row',
            gap: 0.5,
            cursor: 'pointer',
          }}>
          <Box
            component={Icon}
            icon={ArrowRightIcon}
            sx={{
              width: 15,
              color: 'text.secondary',
            }}
          />
          <Typography
            variant="subtitle3"
            sx={{
              color: 'text.secondary',
              lineHeight: 1,
            }}>
            {gitRef}
          </Typography>
          <Box
            component={Icon}
            icon={ArrowDownIcon}
            sx={{
              width: 15,
              color: 'text.primary',
            }}
          />
        </Stack>
      </Dropdown>
    </>
  );
}

function BranchList({
  projectId,
  _ref: ref,
  isDefault,
  onItemClick = undefined,
  onCreate = undefined,
  onRename = undefined,
  onDelete = undefined,
}: {
  projectId: string;
  _ref: string;
  isDefault: boolean;
  onItemClick?: (branch: string) => any;
  onCreate?: () => any;
  onRename?: () => any;
  onDelete?: () => any;
}) {
  const { t } = useLocaleContext();

  const {
    state: { branches },
  } = useProjectState(projectId, ref);

  return (
    <MenuList
      data-testid="branch-list"
      autoFocusItem
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.25,
        '& .MuiMenuItem-root': {
          '& .MuiSvgIcon-root': {
            fontSize: 15,
            marginRight: (theme: any) => theme.spacing(1),
          },
          '&:active': {
            backgroundColor: (theme: any) => alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
          },
        },
      }}>
      {branches.map((branch) => (
        <MenuItem className="branch-item" key={branch} selected={branch === ref} onClick={() => onItemClick?.(branch)}>
          {branch === ref ? (
            <Box
              component={Icon}
              icon={CheckIcon}
              sx={{
                mr: 1,
                width: 15,
              }}
            />
          ) : (
            <Box
              sx={{
                mr: 1,
                width: 15,
              }}
            />
          )}
          {branch}
        </MenuItem>
      ))}
      <Divider sx={{ m: '0 !important' }} />
      <MenuItem onClick={onCreate} sx={{ color: 'info.main' }}>
        <Box
          component={Icon}
          icon={ArrowLeftIcon}
          sx={{
            mr: 1,
            width: 15,
            color: 'info.main',
          }}
        />
        {t('newObject', { object: t('branch') })}
      </MenuItem>
      {!isDefault && (
        <>
          <Divider sx={{ m: '0 !important' }} />

          <MenuItem onClick={onRename}>
            <Box
              component={Icon}
              icon={PencilIcon}
              sx={{
                mr: 1,
                width: 15,
                color: 'text.primary',
              }}
            />
            {t('rename')}
          </MenuItem>

          <MenuItem onClick={onDelete} sx={{ color: 'error.main' }}>
            <Box
              component={Icon}
              icon={TrashIcon}
              sx={{
                mr: 1,
                width: 15,
                color: 'error.main',
              }}
            />
            {t('delete')}
          </MenuItem>
        </>
      )}
    </MenuList>
  );
}

function CreateBranch({
  projectId,
  _ref,
  onChange,
}: {
  projectId: string;
  _ref: string;
  onChange: (data: { new: string; source: string }) => void;
}) {
  const { t } = useLocaleContext();
  const [states, setStates] = useState({ new: '', source: _ref });

  const { state } = useProjectState(projectId, _ref);

  const rows = useMemo(() => {
    return state.branches.map((branch) => ({ branch }));
  }, [state.branches]);

  useEffect(() => {
    if (!states.source && rows[0]?.branch) {
      states.source = rows[0]?.branch;
    }

    onChange(states);
  }, [states, rows]);

  return (
    <Stack
      sx={{
        gap: 1.5,
      }}>
      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 0.5,
          }}>
          {t('name')}
        </Typography>
        <TextField
          autoFocus
          label={t('name')}
          fullWidth
          value={states.new}
          onChange={(e) => setStates((r) => ({ ...r, new: e.target.value }))}
        />
      </Box>
      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            mb: 0.5,
          }}>
          {t('sourceBranch')}
        </Typography>
        <TextField
          select
          label={t('sourceBranch')}
          fullWidth
          value={states.source || rows[0]?.branch}
          onChange={(e) => setStates((r) => ({ ...r, source: e.target.value }))}>
          {rows.map((option) => (
            <MenuItem key={option.branch} value={option.branch}>
              {option.branch}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    </Stack>
  );
}
