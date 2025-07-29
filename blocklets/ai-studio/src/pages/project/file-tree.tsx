import { agentTypesMap } from '@app/components/file-editor/agent-type-select';
import { useCurrentProject } from '@app/contexts/project';
import AigneLogo from '@app/icons/aigne-logo';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { stringifyIdentity } from '@blocklet/ai-runtime/common/aid';
import { AssistantYjs, fileToYjs, isAssistant, nextAssistantId } from '@blocklet/ai-runtime/types';
import { isNonNullable } from '@blocklet/ai-runtime/utils/is-non-nullable';
import { css } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import ArrowBackUpIcon from '@iconify-icons/tabler/arrow-back-up';
import ChevronDownIcon from '@iconify-icons/tabler/chevron-down';
import CopyIcon from '@iconify-icons/tabler/copy';
import DotsVerticalIcon from '@iconify-icons/tabler/dots-vertical';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
import FileDiscIcon from '@iconify-icons/tabler/file-description';
import FolderPlusIcon from '@iconify-icons/tabler/folder-plus';
import DiffIcon from '@iconify-icons/tabler/layers-difference';
import PencilIcon from '@iconify-icons/tabler/pencil';
import TrashIcon from '@iconify-icons/tabler/trash';
import { DragLayerMonitorProps, MultiBackend, NodeModel, Tree, getBackendOptions } from '@minoru/react-dnd-treeview';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  BoxProps,
  Button,
  CircularProgress,
  ClickAwayListener,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Input,
  List,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  StackProps,
  Tooltip,
  Typography,
  accordionSummaryClasses,
  svgIconClasses,
  tooltipClasses,
  useTheme,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import uniqBy from 'lodash/uniqBy';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { JSX, ReactNode, SyntheticEvent, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { useNavigate } from 'react-router-dom';
import { Balancer } from 'react-wrap-balancer';
import { joinURL } from 'ufo';

import AwarenessIndicator from '../../components/awareness/awareness-indicator';
import { getErrorMessage } from '../../libs/api';
import { exportAssistantsToProject } from '../../libs/project';
import useDialog from '../../utils/use-dialog';
import Compare from './compare';
import Close from './icons/close';
import Empty from './icons/empty';
import FolderClose from './icons/folder-close';
import ImportFrom from './import';
import { useAssistantChangesState } from './state';
import type { AssistantYjsWithParents } from './state';
import {
  PROMPTS_FOLDER_NAME,
  createFileName,
  createFolder,
  deleteFile,
  isBuiltinFolder,
  moveFile,
  useCreateFile,
  useProjectStore,
} from './yjs-state';

export type EntryWithMeta =
  | {
      type: 'file';
      name: string;
      filename: string;
      parent: string[];
      path: string[];
      meta: AssistantYjs;
    }
  | {
      type: 'folder';
      name: string;
      filename: string;
      parent: string[];
      path: string[];
    };

export type TreeNode = NodeModel<EntryWithMeta>;

export interface ImperativeFileTree {
  newFolder: (options?: Partial<Omit<Parameters<typeof createFolder>[0], 'store'>>) => void;
  newFile: (options?: Partial<Omit<Parameters<ReturnType<typeof useCreateFile>>[0], 'store'>>) => void;
  importFrom: () => void;
}

const DOUBLE_CLICK_RENAME_TIME_GAP = 200;

const FileTree = ({
  ref,
  projectId,
  gitRef,
  current = undefined,
  mutable = undefined,
  onLaunch = undefined,
  ...props
}: {
  ref: React.Ref<ImperativeFileTree>;
  projectId: string;
  gitRef: string;
  current?: string;
  mutable?: boolean;
  onLaunch?: (assistant: AssistantYjs) => any;
} & Omit<BoxProps, 'onClick' | 'ref'>) => {
  const theme = useTheme();
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { dialog, showDialog } = useDialog();

  const { store, synced, config } = useProjectStore(projectId, gitRef);
  const { deleted, changes, getOriginTemplate } = useAssistantChangesState(projectId, gitRef);
  const dialogState = usePopupState({ variant: 'dialog' });
  const [compareAssistant, setCompareAssistant] = useState('');

  const [openIds, setOpenIds] = useLocalStorageState<(string | number)[]>('ai-studio.tree.openIds');

  const openFolder = useCallback(
    (...path: (string | string[])[]) => {
      const paths = path.flatMap((i) =>
        (Array.isArray(i) ? i : i.split('/')).map((_, index, arr) => arr.slice(0, index + 1).join('/'))
      );

      setOpenIds((ids) => [...new Set((ids ?? []).concat(paths))]);
    },
    [setOpenIds]
  );

  useEffect(() => {
    if (current) openFolder(current);
  }, [current, openFolder]);

  const createFile = useCreateFile();

  const onCreateFile = useCallback(
    (options: Partial<Omit<Parameters<ReturnType<typeof useCreateFile>>[0], 'store'>> = {}) => {
      const { filepath, file } = createFile({ ...options, store });
      if (!store.files[config?.entry!]) {
        config.entry = file.id;
      }

      const { parent } = options;
      if (parent) openFolder(parent);
      navigate(joinURL('.', filepath));
    },
    [navigate, openFolder, store]
  );

  const [editingFolderPath, setEditingFolderPath] = useState<string>();
  const [editingFileName, setEditingFileName] = useState<string>();

  const onCreateFolder = useCallback(
    (options: Partial<Omit<Parameters<typeof createFolder>[0], 'store'>> = {}) => {
      const path = createFolder({ ...options, store });
      setEditingFolderPath(path);
      openFolder(path);
    },
    [openFolder, store]
  );

  const onImportFrom = useCallback(() => {
    const state: { resources: string[]; projectId: string; ref: string } = { resources: [], projectId: '', ref: '' };

    showDialog({
      fullWidth: true,
      maxWidth: 'sm',
      title: t('importObject', { object: t('agents') }),
      content: (
        <Box
          sx={{
            maxHeight: 500,
          }}>
          <ImportFrom
            projectId={projectId}
            gitRef={gitRef}
            onChange={(data: { [key: string]: boolean }, projectId: string, ref: string) => {
              state.resources = Object.keys(data).filter((key: string): boolean => Boolean(data[key]));
              state.projectId = projectId;
              state.ref = ref;
            }}
          />
        </Box>
      ),
      onOk: async () => {
        try {
          const { assistants } = await exportAssistantsToProject(projectId, gitRef, state);
          if (assistants.length) {
            for (const template of assistants) {
              createFile({ store, parent: template.parent, meta: fileToYjs(template) as AssistantYjs });
            }
          } else {
            Toast.error(t('import.selectAgentTip'));
          }
        } catch (error) {
          Toast.error(getErrorMessage(error));
          throw error;
        }
      },
    });
  }, [gitRef, projectId, showDialog, store, t]);

  useImperativeHandle(
    ref,
    () => ({
      newFolder: (options) => onCreateFolder(options),
      newFile: (options) => onCreateFile(options),
      importFrom: () => onImportFrom(),
    }),
    [onCreateFolder, onCreateFile, onImportFrom]
  );

  const onMoveFile = useCallback(
    ({ from, to }: { from: string[]; to: string[] }) => {
      moveFile({ store, from, to });

      openFolder(to);

      const filename = current?.split('/').slice(-1)[0];
      const filepath = filename ? Object.values(store.tree).find((i) => i?.endsWith(filename)) : undefined;

      if (filepath?.endsWith('.yaml')) navigate(joinURL('.', filepath), { replace: true });
    },
    [current, navigate, openFolder, store]
  );

  const onDeleteFile = useCallback(
    ({ path }: { path: string[] }) => {
      deleteFile({ store, path });

      if (current?.startsWith(path.join('/'))) {
        navigate('.', { replace: true });
      }
    },
    [current, navigate, store]
  );

  const folders = uniqBy(
    [...new Set(Object.values(store.tree).map((filepath) => filepath?.split('/').slice(0, -1).join('/')))]
      .flatMap((filepath) => {
        if (!filepath) return [];
        const parent = filepath.split('/').filter(Boolean);
        return parent.map((name, index) => {
          return {
            type: 'folder' as const,
            name,
            parent: parent.slice(0, index),
          };
        });
      })
      .concat({
        type: 'folder',
        name: PROMPTS_FOLDER_NAME,
        parent: [],
      }),
    (a) => a.parent.concat(a.name).join('/')
  );

  const files = Object.entries(store.tree)
    .map(([key, filepath]) => {
      const file = store.files[key];
      if (filepath?.endsWith('.yaml') && file && isAssistant(file)) {
        const paths = filepath.split('/').filter(Boolean);
        return {
          type: 'file' as const,
          name: file.name || '',
          parent: paths.slice(0, -1),
          meta: file,
        };
      }

      return undefined;
    })
    .filter(isNonNullable);

  const tree = [...folders, ...files]
    // filter all files not in the `/prompts/` folder
    .filter(
      (i) =>
        (i.type === 'folder' && i.name === PROMPTS_FOLDER_NAME && !i.parent.length) ||
        i.parent[0] === PROMPTS_FOLDER_NAME
    )
    .map((item) => {
      const filename = item.type === 'file' ? `${item.meta.id}.yaml` : item.name;
      const path = item.parent.concat(filename);

      return {
        id: joinURL('', ...path),
        text: item.name,
        parent: item.parent.join('/'),
        droppable: item.type === 'folder',
        data: { ...item, path, filename },
      };
    });

  const lastClickTime = useRef<{ time: number; timer: number }>(undefined);

  if (!synced) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  const files1 = tree.filter((x) => x.parent);
  if (!files1.length) {
    return (
      <>
        {dialog}
        <Stack
          sx={{
            color: 'text.disabled',
            alignItems: 'center',
            my: 8.5,
            gap: 3,
          }}>
          <Empty sx={{ fontSize: 54, color: 'grey.300' }} />
          <Typography
            sx={{
              px: 2,
              width: '100%',
              textAlign: 'center',
            }}>
            <Balancer>{t('agentEmptySubTitle')}</Balancer>
          </Typography>
        </Stack>
      </>
    );
  }

  const handleClick = (onToggle: () => void, filepath: string) => {
    const now = Date.now();
    if (lastClickTime.current && now - lastClickTime.current.time <= DOUBLE_CLICK_RENAME_TIME_GAP) {
      setEditingFolderPath(filepath);

      clearTimeout(lastClickTime.current.timer);
      lastClickTime.current = undefined;
    } else {
      lastClickTime.current = {
        time: now,
        timer: window.setTimeout(() => {
          onToggle();
        }, DOUBLE_CLICK_RENAME_TIME_GAP),
      };
    }
  };

  return (
    <>
      <Box {...props} data-testid="file-tree">
        <DndProvider backend={MultiBackend} options={getBackendOptions()}>
          <Tree
            data-testid="agent-tree"
            tree={tree}
            rootId={PROMPTS_FOLDER_NAME}
            initialOpen={openIds}
            onChangeOpen={setOpenIds}
            canDrag={(node) => !!mutable && !isBuiltinFolder(node?.id as any)}
            canDrop={(_, { dragSource, dropTarget }) => {
              const sourceRoot = dragSource?.data?.path[0];
              const targetRoot = dropTarget?.data?.path[0];
              return dropTarget?.data?.type === 'folder' && !!sourceRoot && sourceRoot === targetRoot;
            }}
            onDrop={async (_, { dragSource, dropTarget }) => {
              const source = dragSource?.data;
              const target = dropTarget?.data;
              if (source) {
                const to = (target?.path ?? []).concat(source.filename);

                onMoveFile({ from: source.path, to });
              }
            }}
            classes={{
              root: css`
                min-height: '100%';
                padding-bottom: ${theme.spacing(10)};
              `,
              dropTarget: css`
                background-color: ${theme.palette.action.hover};
              `,
            }}
            listComponent="div"
            listItemComponent="div"
            dragPreviewRender={({ item }) => <DragPreviewRender item={item} />}
            render={(node, { depth, isOpen, onToggle }) => {
              if (!node.data) {
                return <Box />;
              }

              const { parent } = node.data;
              const filename = node.data.type === 'file' ? `${node.data.meta.id}.yaml` : node.data.name;
              const filepath = parent.concat(filename).join('/');

              if (node.data.type === 'folder') {
                return (
                  <TreeItem
                    className="file-tree-folder"
                    key={node.id}
                    icon={
                      <Box
                        className="file-tree-folder-icon"
                        component={Icon}
                        icon={ChevronDownIcon}
                        sx={{ transform: `rotateZ(${isOpen ? '0' : '-90deg'})` }}
                      />
                    }
                    depth={depth}
                    onClick={() => handleClick(onToggle, filepath)}
                    editing={filepath === editingFolderPath}
                    actions={
                      <TreeItemMenus
                        projectId={projectId}
                        gitRef={gitRef}
                        item={node.data}
                        onCreateFolder={mutable ? onCreateFolder : undefined}
                        onCreateFile={mutable ? onCreateFile : undefined}
                        onRenameFolder={({ path }) => setEditingFolderPath(path.join('/'))}
                        onDeleteFile={onDeleteFile}
                        onLaunch={onLaunch}
                      />
                    }>
                    <EditTextItem
                      editing={filepath === editingFolderPath}
                      onCancel={() => setEditingFolderPath(undefined)}
                      onSubmit={async (name) => {
                        setEditingFolderPath(undefined);
                        const { data } = node;
                        if (!data || name === data.name) return;
                        onMoveFile({ from: data.parent.concat(data.name), to: data.parent.concat(name) });
                      }}>
                      {node.text}
                    </EditTextItem>
                  </TreeItem>
                );
              }

              const { meta } = node.data;
              const name = `${meta.id}.yaml`;
              const selected = current?.endsWith(name);

              const isEntryAgent = meta.id === config?.entry;

              const change = changes(meta);

              const actions = (
                <TreeItemMenus
                  projectId={projectId}
                  gitRef={gitRef}
                  item={node.data}
                  onCreateFile={mutable ? onCreateFile : undefined}
                  onRenameFile={({ name }) => setEditingFileName(name)}
                  onDeleteFile={mutable ? onDeleteFile : undefined}
                  onLaunch={onLaunch}
                  isChanged={Boolean(change?.key === 'M' && getOriginTemplate(meta))}
                  onCompare={() => {
                    const assistant = getOriginTemplate(meta);
                    if (assistant) {
                      setCompareAssistant([...(assistant?.parent || []), `${assistant.id}.yaml`].join('/'));
                      dialogState.toggle();
                    }
                  }}
                  onUndo={() => {
                    showDialog({
                      fullWidth: true,
                      maxWidth: 'xs',
                      title: `${t('restore')}`,
                      content: (
                        <Box
                          sx={{
                            maxHeight: 500,
                          }}>
                          {t('restoreConform', { path: meta.name || t('alert.unnamed') })}
                        </Box>
                      ),
                      onOk: () => {
                        const assistant = getOriginTemplate(meta);
                        if (assistant) {
                          const { parent: innerParent, ...data } = assistant;
                          deleteFile({ store, path: [...innerParent, name] });
                          onCreateFile({ parent: innerParent, meta: data, rootFolder: PROMPTS_FOLDER_NAME });
                        }
                      },
                    });
                  }}
                  onSetAsEntry={(assistant) => {
                    config.entry = assistant.id;
                  }}
                />
              );

              const children = (
                <Box sx={{ position: 'relative' }} className="agent-box" data-testid="agent-box">
                  <TreeItem
                    className="agent-tree-item"
                    key={node.id}
                    icon={<FileIcon assistant={meta} />}
                    depth={depth}
                    editing={meta.name === editingFileName}
                    selected={selected}
                    onClick={() => navigate(joinURL('.', filepath))}
                    onDoubleClick={() => setEditingFileName(meta.name)}
                    actions={actions}
                    sx={{ color: change?.color }}>
                    <EditTextItem
                      isEntry={isEntryAgent}
                      editing={meta.name === editingFileName}
                      onCancel={() => setEditingFileName(undefined)}
                      onSubmit={async (name) => {
                        setEditingFileName(undefined);
                        const { data } = node;
                        if (!data || name === data.name) return;
                        meta.name = name;
                      }}>
                      {createFileName({ store, name: meta.name, defaultName: `${t('alert.unnamed')} Agent` })}
                    </EditTextItem>
                  </TreeItem>
                  <AwarenessIndicator
                    projectId={projectId}
                    gitRef={gitRef}
                    path={[meta.id]}
                    sx={{ position: 'absolute', right: 8, top: -2 }}
                  />
                </Box>
              );

              if (change) {
                return (
                  <Tooltip title={change.tips} disableInteractive placement="top">
                    <Box>{children}</Box>
                  </Tooltip>
                );
              }
              return children;
            }}
          />
        </DndProvider>
      </Box>
      {!!deleted.length && (
        <DeletedTemplates
          list={deleted}
          gitRef={gitRef}
          changes={changes}
          projectId={projectId}
          onCreateFile={onCreateFile}
          onCompare={(assistant) => {
            if (assistant) {
              setCompareAssistant([...(assistant?.parent || []), `${assistant.id}.yaml`].join('/'));
              dialogState.toggle();
            }
          }}
        />
      )}
      {dialog}
      <Dialog {...bindDialog(dialogState)} maxWidth="xl" fullWidth>
        <DialogTitle className="between">
          {t('alert.compare')}

          <IconButton size="small" onClick={dialogState.close}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Compare projectId={projectId} gitRef={gitRef} filepath={compareAssistant || ''} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FileTree;

function DragPreviewRender({ item }: Pick<DragLayerMonitorProps<EntryWithMeta>, 'item'>) {
  const { t } = useLocaleContext();

  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        px: 1,
        borderRadius: 1,
        minHeight: 28,
        maxWidth: 140,
        bgcolor: 'action.selected',
      }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: (theme) => theme.spacing(3),
          [`.${svgIconClasses.root}`]: { fontSize: '1.25rem', color: 'text.secondary' },
        }}>
        {item.data?.type === 'folder' ? <FolderClose /> : <Box component={Icon} icon={FileDiscIcon} />}
      </Box>
      <Box
        sx={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
        {item.text || t('unnamed')}
      </Box>
    </Stack>
  );
}

function TreeItemMenus({
  projectId,
  gitRef,
  isChanged = undefined,
  item,
  onRenameFolder = undefined,
  onCreateFolder = undefined,
  onRenameFile = undefined,
  onCreateFile = undefined,
  onDeleteFile = undefined,
  onLaunch = undefined,
  onCompare = undefined,
  onUndo = undefined,
  onSetAsEntry = undefined,
}: {
  projectId: string;
  gitRef: string;
  isChanged?: boolean;
  item: EntryWithMeta;
  onRenameFolder?: (options: { path: string[] }) => any;
  onCreateFolder?: (options?: { parent?: string[] }) => any;
  onRenameFile?: (options: { name: string }) => void;
  onCreateFile?: (options?: Partial<Omit<Parameters<ReturnType<typeof useCreateFile>>[0], 'store'>>) => any;
  onDeleteFile?: (options: { path: string[] }) => any;
  onLaunch?: (assistant: AssistantYjs) => any;
  onCompare?: () => void;
  onUndo?: () => void;
  onSetAsEntry?: (assistant: AssistantYjs) => void;
}) {
  const { t } = useLocaleContext();

  const assistant = item.type === 'file' && isAssistant(item.meta) ? item.meta : undefined;
  const { config } = useProjectStore(projectId, gitRef);

  const isEntry = !!assistant && assistant.id === config?.entry;

  const menus = [
    [
      assistant && onSetAsEntry && (
        <MenuItem
          key="set-as-entry"
          disabled={isEntry}
          onClick={() => onSetAsEntry(assistant)}
          data-testid="set-as-entry">
          <ListItemIcon>
            <Box component={AigneLogo} sx={{ fontSize: 14 }} />
          </ListItemIcon>
          <ListItemText primary={t('setAsEntry')} />
        </MenuItem>
      ),
      onLaunch && assistant && (
        <MenuItem key="launch" onClick={() => onLaunch(assistant)} data-testid="launch">
          <ListItemIcon>
            <Box component={Icon} icon={ExternalLinkIcon} />
          </ListItemIcon>
          <ListItemText primary={t('alert.openInAssistant')} />
        </MenuItem>
      ),
    ],
    [
      item.type === 'folder' && onCreateFolder && (
        <MenuItem key="createFolder" onClick={() => onCreateFolder({ parent: item.path })} data-testid="create-folder">
          <ListItemIcon>
            <Box component={Icon} icon={FolderPlusIcon} />
          </ListItemIcon>
          <ListItemText primary={t('newObject', { object: t('folder') })} />
        </MenuItem>
      ),

      item.type === 'folder' && onCreateFile && (
        <MenuItem key="createAgent" onClick={() => onCreateFile({ parent: item.path })} data-testid="create-agent">
          <ListItemIcon>{agentTypesMap.prompt?.icon} </ListItemIcon>
          <ListItemText primary={t('newObject', { object: t('agent') })} />
        </MenuItem>
      ),
      item.type === 'file' && onCreateFile && (
        <MenuItem
          data-testid="copy-file"
          key="duplicateFile"
          onClick={() =>
            onCreateFile({
              parent: item.parent,
              meta: {
                ...JSON.parse(JSON.stringify(item.meta)),
                id: nextAssistantId(),
                name: item.meta.name && `${item.meta.name} Copy`,
              },
            })
          }>
          <ListItemIcon>
            <Box component={Icon} icon={CopyIcon} />
          </ListItemIcon>
          <ListItemText primary={t('alert.duplicate')} />
        </MenuItem>
      ),
      item.type === 'file' && (
        <MenuItem
          data-testid="copy-file-id"
          key="copyId"
          onClick={() => {
            navigator.clipboard.writeText(
              stringifyIdentity({
                projectId,
                projectRef: gitRef,
                agentId: item.meta.id,
              })
            );
          }}>
          <ListItemIcon>
            <Box component={Icon} icon={DiffIcon} />
          </ListItemIcon>
          <ListItemText primary={t('alert.copyId')} />
        </MenuItem>
      ),
    ],
    [
      isChanged && (
        <MenuItem key="compareChanges" onClick={onCompare} data-testid="compare-change">
          <ListItemIcon>
            <Box component={Icon} icon={DiffIcon} />
          </ListItemIcon>
          <ListItemText primary={t('alert.compare')} />
        </MenuItem>
      ),

      isChanged && (
        <MenuItem key="revertChanges" onClick={onUndo} data-testid="revert-change">
          <ListItemIcon>
            <Box component={Icon} icon={ArrowBackUpIcon} />
          </ListItemIcon>
          <ListItemText primary={t('restore')} />
        </MenuItem>
      ),
    ],
    [
      onRenameFile && (
        <MenuItem key="renameFile" disabled={isEntry} onClick={() => onRenameFile(item)} data-testid="rename-file">
          <ListItemIcon>
            <Box component={Icon} icon={PencilIcon} />
          </ListItemIcon>

          <ListItemText primary={t('rename')} />
        </MenuItem>
      ),
      onRenameFolder && (
        <MenuItem key="renameFolder" onClick={() => onRenameFolder(item)} data-testid="rename-folder">
          <ListItemIcon>
            <Box component={Icon} icon={PencilIcon} />
          </ListItemIcon>

          <ListItemText primary={t('rename')} />
        </MenuItem>
      ),
      onDeleteFile && (
        <MenuItem key="deleteFile" onClick={() => onDeleteFile(item)} data-testid="delete-file">
          <ListItemIcon>
            <Box
              component={Icon}
              icon={TrashIcon}
              sx={{
                color: 'warning.main',
              }}
            />
          </ListItemIcon>
          <ListItemText
            primary={t('alert.delete')}
            slotProps={{
              primary: { color: 'warning.main' },
            }}
          />
        </MenuItem>
      ),
    ],
  ]
    .map((i) => i.filter((j): j is JSX.Element => Boolean(j)))
    .filter((i) => !!i.length);

  return (
    <>
      {menus.map((group, index) => {
        return [index !== 0 && <Divider key={`divider-${index}`} sx={{ my: 0.5 }} />, ...group];
      })}
    </>
  );
}

function EditTextItem({
  isEntry = undefined,
  editing = undefined,
  children = undefined,
  onCancel = undefined,
  onSubmit = undefined,
}: {
  isEntry?: boolean;
  editing?: boolean;
  children?: string;
  onCancel?: () => any;
  onSubmit?: (text: string) => any;
}) {
  const { t } = useLocaleContext();
  const [value, setValue] = useState(children);

  const submit = async () => {
    if (!value) {
      setValue(children);
      onCancel?.();
      return;
    }

    try {
      await onSubmit?.(value.replace(/\//g, ''));
    } catch (error) {
      onCancel?.();
      setValue(children);
      Toast.error(getErrorMessage(error));
      throw error;
    }
  };
  return editing ? (
    <Input
      data-testid="edit-text-item"
      className="edit-text-item"
      disableUnderline
      fullWidth
      value={value || ''}
      onChange={(e) => setValue(e.target.value)}
      sx={{
        fontSize: 13,
        height: 24,
        fontWeight: 500,
        lineHeight: '24px',
        display: 'flex',
        alignItems: 'center',
      }}
      autoFocus
      inputProps={{ style: { height: '100%', padding: 0 } }}
      onKeyDown={(e) => {
        if (e.keyCode === 229) {
          return;
        }
        if (e.key === 'Escape') {
          setValue(children);
          onCancel?.();
          return;
        }
        if (!e.shiftKey && e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      }}
      onBlur={submit}
    />
  ) : (
    <>
      {children}
      {isEntry && ` (${t('entryAgent')})`}
    </>
  );
}

function TreeItem({
  icon = undefined,
  children = undefined,
  depth = 0,
  actions = undefined,
  editing = undefined,
  selected = undefined,
  otherActions = undefined,
  ...props
}: {
  icon?: ReactNode;
  children?: ReactNode;
  depth?: number;
  actions?: ReactNode;
  editing?: boolean;
  selected?: boolean;
  otherActions?: ReactNode;
} & StackProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (selected) {
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [selected]);

  return (
    <Stack
      data-testid="tree-item"
      direction="row"
      sx={{
        mx: 1,
        borderRadius: 1,
        bgcolor: editing ? 'action.hover' : selected ? '#EFF6FF' : open ? 'action.hover' : undefined,
        color: selected ? '#3B82F6' : undefined,
        fontWeight: 500,
        fontSize: 13,
        ':hover': {
          bgcolor: selected ? 'action.selected' : 'action.hover',
          '.hover-visible': { maxWidth: '100%' },
        },
        outline: editing ? 1 : 0,
        outlineColor: 'primary.main',
        outlineOffset: -1,
      }}>
      <Stack
        ref={ref}
        {...props}
        direction="row"
        sx={[
          {
            alignItems: 'center',
            gap: 0.5,
            position: 'relative',
            pl: depth * 2 + 1.5,
            pr: 1.5,
            py: 0.5,
            flex: 1,
            cursor: 'pointer',
            overflow: 'hidden',
            ...props.sx,
          },
          ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
        ]}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1,
            [`.${svgIconClasses.root}`]: {
              fontSize: '1rem',
              fontWeight: 500,
              color: selected ? '#3B82F6' : 'text.secondary',
            },
          }}>
          {icon}
        </Box>

        <Box
          sx={{
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: 24,
            lineHeight: '24px',
          }}>
          {children}
        </Box>
      </Stack>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
        }}>
        {actions && (
          <Stack
            component="span"
            className="hover-visible"
            sx={{
              justifyContent: 'center',
              alignItems: 'flex-end',
              overflow: 'hidden',
              maxWidth: open ? '100%' : 0,
            }}>
            <Tooltip
              open={open}
              placement="right-start"
              onClose={() => setOpen(false)}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              title={
                <ClickAwayListener onClickAway={() => setOpen(false)}>
                  <Paper elevation={0}>
                    <List onClick={() => setOpen(false)}>{actions}</List>
                  </Paper>
                </ClickAwayListener>
              }
              slotProps={{
                popper: {
                  sx: {
                    [`&.${tooltipClasses.popper}[data-popper-placement*="left"] .${tooltipClasses.tooltip}`]: { mr: 1 },
                    [`&.${tooltipClasses.popper}[data-popper-placement*="right"] .${tooltipClasses.tooltip}`]: {
                      ml: 1,
                    },
                  },
                },
                tooltip: { sx: { bgcolor: 'background.paper', boxShadow: 1, m: 0, p: 0.5 } },
              }}>
              <Button
                data-testid="tree-item-actions-button"
                onClick={() => setOpen(true)}
                sx={{ padding: 0.5, minWidth: 0, bgcolor: open ? 'action.hover' : undefined }}>
                <Box
                  component={Icon}
                  icon={DotsVerticalIcon}
                  sx={{
                    fontSize: 16,
                  }}
                />
              </Button>
            </Tooltip>
          </Stack>
        )}

        {otherActions && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
            }}>
            {otherActions}
          </Box>
        )}
      </Box>
    </Stack>
  );
}

function DeletedTemplates({
  list,
  changes,
  projectId,
  gitRef,
  onCreateFile,
  onCompare,
}: {
  projectId: string;
  gitRef: string;
  list: AssistantYjsWithParents[];
  changes: (item: AssistantYjsWithParents) => {
    key: string;
    color: string;
    tips: string;
  } | null;
  onCreateFile: (options?: Partial<Omit<Parameters<ReturnType<typeof useCreateFile>>[0], 'store'>>) => void;
  onCompare: (item: AssistantYjsWithParents) => void;
}) {
  const { t } = useLocaleContext();

  const [expanded, setExpanded] = useState<string | false>('delete-panel');

  const handleChange = (panel: string) => (_e: SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  return (
    <Accordion
      disableGutters
      expanded={expanded === 'delete-panel'}
      onChange={handleChange('delete-panel')}
      elevation={0}
      sx={{
        ':before': { display: 'none' },
        position: 'sticky',
        bottom: 0,
        p: 0,
      }}>
      <AccordionSummary
        sx={{
          px: 2,
          bgcolor: 'grey.50',
          minHeight: (theme) => theme.spacing(3.5),
          [`.${accordionSummaryClasses.content}`]: { m: 0, py: 0, overflow: 'hidden', alignItems: 'center' },
        }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            minWidth: (theme) => theme.spacing(3),
          }}>
          <Box
            component={Icon}
            icon={ChevronDownIcon}
            sx={{
              fontSize: 20,
              transform: `rotateZ(${expanded ? '0' : '-90deg'})`,
              transition: (theme) => theme.transitions.create('all'),
            }}
          />
        </Box>

        <Typography
          variant="caption"
          noWrap
          sx={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
          {t('diff.deleted')}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ py: 1, px: 0 }}>
        <Box
          sx={{
            maxHeight: '120px',
            overflow: 'auto',
          }}>
          {list.map((item) => {
            const icon = <FileIcon assistant={item} />;

            const change = changes(item);
            if (!change) return null;

            return (
              <TreeItem
                key={item.id}
                icon={icon}
                depth={0}
                otherActions={
                  <>
                    <Tooltip title={t('alert.compare')} disableInteractive placement="top">
                      <Button
                        sx={{ padding: 0.5, minWidth: 0 }}
                        onClick={() => {
                          onCompare(item);
                        }}>
                        <Box component={Icon} icon={DiffIcon} sx={{ fontSize: 20 }} />
                      </Button>
                    </Tooltip>

                    <Tooltip title={t('restore')} disableInteractive placement="top">
                      <Button
                        sx={{ padding: 0.5, minWidth: 0 }}
                        onClick={() => {
                          const { parent, ...meta } = item;
                          onCreateFile({ parent, meta });
                        }}>
                        <Box component={Icon} icon={ArrowBackUpIcon} sx={{ fontSize: 20 }} />
                      </Button>
                    </Tooltip>
                  </>
                }>
                <Box
                  sx={{
                    textDecoration: 'line-through',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: '14px',
                    gap: '2px',
                  }}>
                  {!!item.parent?.length &&
                    item.parent.map((x, i) => {
                      if (i === 0) {
                        return null;
                      }

                      return (
                        <Box key={x} sx={{ color: (theme) => theme.palette.action.disabled }}>
                          {`${x} / `}
                        </Box>
                      );
                    })}
                  {item.name || t('unnamed')}
                </Box>

                <AwarenessIndicator
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[item.id]}
                  sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
                />
              </TreeItem>
            );
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

function FileIcon({ assistant }: { assistant: Pick<AssistantYjs, 'id' | 'type'> }) {
  const { projectId, projectRef } = useCurrentProject();
  const { config } = useProjectStore(projectId, projectRef);

  if (config?.entry === assistant.id) return <Box component={AigneLogo} sx={{ fontSize: '1em !important' }} />;

  return agentTypesMap[assistant.type!]?.icon || null;
}
