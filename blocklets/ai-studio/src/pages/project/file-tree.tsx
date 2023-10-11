import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { css } from '@emotion/css';
import { MultiBackend, NodeModel, Tree, getBackendOptions } from '@minoru/react-dnd-treeview';
import {
  Box,
  BoxProps,
  Button,
  CircularProgress,
  ClickAwayListener,
  Input,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  listItemButtonClasses,
  listItemIconClasses,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { uniqBy } from 'lodash';
import { ComponentProps, ReactNode, forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { useNavigate } from 'react-router-dom';
import joinUrl from 'url-join';

import { TemplateYjs } from '../../../api/src/store/projects';
import AwarenessIndicator from '../../components/awareness/awareness-indicator';
import { getErrorMessage } from '../../libs/api';
import Add from './icons/add';
import Duplicate from './icons/duplicate';
import External from './icons/external';
import File from './icons/file';
import FolderClose from './icons/folder-close';
import FolderOpen from './icons/folder-open';
import MenuVertical from './icons/menu-vertical';
import Pen from './icons/pen';
import Picture from './icons/picture';
import Trash from './icons/trash';
import { createFile, createFolder, deleteFile, isTemplate, moveFile, nextTemplateId, useStore } from './yjs-state';

export type EntryWithMeta =
  | {
      type: 'file';
      name: string;
      filename: string;
      parent: string[];
      path: string[];
      meta: TemplateYjs;
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
  newFolder: () => void;
  newFile: () => void;
}

const FileTree = forwardRef<
  ImperativeFileTree,
  {
    projectId: string;
    gitRef: string;
    current?: string;
    mutable?: boolean;
    onLaunch?: (template: TemplateYjs) => any;
  } & Omit<BoxProps, 'onClick'>
>(({ projectId, gitRef, current, mutable, onLaunch, ...props }, ref) => {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const { store, synced } = useStore(projectId, gitRef);

  const [openIds, setOpenIds] = useLocalStorageState<(string | number)[]>('ai-studio.tree.openIds');

  const [showNewProject, setShowNewProject] = useState(false);

  const onCreateFile = useCallback(
    ({ parent, meta }: { parent?: string[]; meta?: TemplateYjs } = {}) => {
      const { filepath } = createFile({ store, parent, meta });
      if (parent) setOpenIds((ids) => (ids ?? []).concat(parent.join('/')));
      navigate(filepath);
    },
    [navigate, setOpenIds, store]
  );

  useImperativeHandle(
    ref,
    () => ({
      newFolder: () => setShowNewProject(true),
      newFile: () => onCreateFile(),
    }),
    [onCreateFile]
  );

  const onMoveFile = useCallback(
    ({ from, to }: { from: string[]; to: string[] }) => {
      moveFile({ store, from, to });

      setOpenIds((ids) => [...new Set((ids ?? []).concat(to.slice(0, -1)))]);

      const filename = current?.split('/').slice(-1)[0];
      const filepath = filename ? Object.values(store.tree).find((i) => i?.endsWith(filename)) : undefined;

      if (filepath?.endsWith('.yaml')) navigate(filepath, { replace: true });
    },
    [current, navigate, setOpenIds, store]
  );

  const onDeleteFile = useCallback(
    ({ path }: { path: string[] }) => {
      deleteFile({ store, path });

      if (current && path.join('/').startsWith(current)) navigate('.', { replace: true });
    },
    [current, navigate, store]
  );

  const folders = uniqBy(
    [...new Set(Object.values(store.tree).map((filepath) => filepath?.split('/').slice(0, -1).join('/')))].flatMap(
      (filepath) => {
        if (!filepath) return [];
        const parent = filepath.split('/');
        return parent.map((name, index) => {
          return {
            type: 'folder' as const,
            name,
            parent: parent.slice(0, index),
          };
        });
      }
    ),
    (a) => a.parent.concat(a.name).join('/')
  );

  const files = Object.entries(store.tree)
    .map(([key, filepath]) => {
      const template = store.files[key];
      if (filepath?.endsWith('.yaml') && template && isTemplate(template)) {
        const paths = filepath.split('/');
        return {
          type: 'file' as const,
          name: template.name || '',
          parent: paths.slice(0, -1),
          meta: template,
        };
      }

      return undefined;
    })
    .filter((i): i is NonNullable<typeof i> => !!i);

  const tree = useMemo<TreeNode[]>(() => {
    return [...folders, ...files].map((item) => {
      const filename = item.type === 'file' ? `${item.meta.id}.yaml` : item.name;
      const path = item.parent.concat(filename);

      return {
        id: joinUrl(...path),
        text: item.name,
        parent: item.parent.join('/'),
        droppable: item.type === 'folder',
        data: { ...item, path, filename },
      };
    });
  }, [files, folders]);

  if (!synced)
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );

  return (
    <Box overflow="hidden" {...props}>
      {showNewProject && (
        <EditableTreeItem
          icon={<FolderClose />}
          key={showNewProject.toString()}
          defaultEditing
          onSubmit={async (value) => {
            const name = value.trim();
            if (name) createFolder({ store, parent: [], name });
            setShowNewProject(false);
          }}
          onCancel={() => setShowNewProject(false)}
        />
      )}

      {!tree.length && !showNewProject && (
        <Box color="text.secondary" textAlign="center" fontSize={14} lineHeight="32px" m={0.5}>
          {t('noFiles')}
        </Box>
      )}

      <DndProvider backend={MultiBackend} options={getBackendOptions()}>
        <Tree
          tree={tree}
          rootId=""
          initialOpen={openIds}
          onChangeOpen={setOpenIds}
          canDrag={() => !!mutable}
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
              min-height: 100%;
              &:after {
                content: '';
                display: block;
                height: 100px;
              }
            `,
            dropTarget: css`
              background-color: rgba(0, 0, 0, 0.05);
            `,
          }}
          listComponent="div"
          listItemComponent="div"
          render={(node, { depth, isOpen, onToggle }) => {
            if (!node.data) {
              return <Box />;
            }

            const actions = (
              <TreeItemMenus
                mutable={mutable}
                item={node.data}
                onCreateFile={onCreateFile}
                onDeleteFile={onDeleteFile}
                onLaunch={onLaunch}
              />
            );

            const { parent } = node.data;
            const filepath = parent.concat(node.data.type === 'file' ? `${node.data.meta.id}.yaml` : node.data.name);

            if (node.data.type === 'folder') {
              return (
                <EditableTreeItem
                  key={node.id}
                  icon={isOpen ? <FolderOpen /> : <FolderClose />}
                  mutable={mutable}
                  depth={depth}
                  onClick={onToggle}
                  onSubmit={async (name) => {
                    const { data } = node;
                    if (!data || name === data.name) return;
                    onMoveFile({ from: data.parent.concat(data.name), to: data.parent.concat(name) });
                  }}
                  actions={actions}>
                  {node.text}
                </EditableTreeItem>
              );
            }

            const { meta } = node.data;
            const name = `${meta.id}.yaml`;
            const selected = current && current.endsWith(name);

            const icon = meta.type === 'image' ? <Picture /> : <File />;

            return (
              <TreeItem
                key={node.id}
                icon={icon}
                depth={depth}
                sx={{ bgcolor: selected ? 'rgba(0,0,0,0.05)' : undefined }}
                onClick={() => navigate(filepath.join('/'))}
                actions={actions}>
                {meta.name || t('alert.unnamed')}

                <AwarenessIndicator
                  projectId={projectId}
                  gitRef={gitRef}
                  path={[meta.id]}
                  sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
                />
              </TreeItem>
            );
          }}
        />
      </DndProvider>
    </Box>
  );
});

export default FileTree;

function TreeItemMenus({
  mutable,
  item,
  onCreateFile,
  onDeleteFile,
  onLaunch,
}: {
  mutable?: boolean;
  item: EntryWithMeta;
  onCreateFile?: (options?: { parent?: string[]; meta?: TemplateYjs }) => any;
  onDeleteFile?: (options: { path: string[] }) => any;
  onLaunch?: (template: TemplateYjs) => any;
}) {
  const { t } = useLocaleContext();

  return (
    <>
      {onLaunch && item.type === 'file' && (
        <ListItemButton onClick={() => onLaunch(item.meta)}>
          <ListItemIcon>
            <External />
          </ListItemIcon>
          <ListItemText primary={t('alert.openInAssistant')} />
        </ListItemButton>
      )}

      {item.type === 'folder' && onCreateFile && (
        <ListItemButton disabled={!mutable} onClick={() => onCreateFile({ parent: item.path })}>
          <ListItemIcon>
            <Add />
          </ListItemIcon>
          <ListItemText primary={t('form.new')} />
        </ListItemButton>
      )}

      {item.type === 'file' && onCreateFile && (
        <ListItemButton
          disabled={!mutable}
          onClick={() =>
            onCreateFile({
              parent: item.parent,
              meta: {
                ...JSON.parse(JSON.stringify(item.meta)),
                id: nextTemplateId(),
                name: item.meta.name && `${item.meta.name} Copy`,
              },
            })
          }>
          <ListItemIcon>
            <Duplicate />
          </ListItemIcon>
          <ListItemText primary={t('alert.duplicate')} />
        </ListItemButton>
      )}

      {onDeleteFile && (
        <ListItemButton disabled={!mutable} onClick={() => onDeleteFile(item)}>
          <ListItemIcon>
            <Trash />
          </ListItemIcon>
          <ListItemText primary={t('alert.delete')} />
        </ListItemButton>
      )}
    </>
  );
}

function EditableTreeItem({
  mutable,
  defaultEditing,
  children,
  onCancel,
  onSubmit,
  ...props
}: Omit<ComponentProps<typeof TreeItem>, 'children' | 'onSubmit'> & {
  mutable?: boolean;
  defaultEditing?: boolean;
  children?: string;
  onCancel?: () => any;
  onSubmit?: (text: string) => any;
}) {
  const { t } = useLocaleContext();

  const [editing, setEditing] = useState(defaultEditing);
  const [value, setValue] = useState(children);

  const submit = async () => {
    if (!value) {
      setEditing(false);
      setValue(children);
      onCancel?.();
      return;
    }

    try {
      await onSubmit?.(value);
      setEditing(false);
    } catch (error) {
      setEditing(false);
      setValue(children);
      Toast.error(getErrorMessage(error));
      throw error;
    }
  };

  return (
    <TreeItem
      {...props}
      actions={
        editing ? null : (
          <>
            <ListItemButton disabled={!mutable} onClick={() => setEditing(true)}>
              <ListItemIcon>
                <Pen />
              </ListItemIcon>

              <ListItemText primary={t('form.rename')} />
            </ListItemButton>

            {props.actions}
          </>
        )
      }>
      {editing ? (
        <Input
          disableUnderline
          fullWidth
          value={value || ''}
          onChange={(e) => setValue(e.target.value)}
          sx={{
            height: 24,
            lineHeight: '24px',
            display: 'flex',
            alignItems: 'center',
          }}
          classes={{
            focused: css`
              outline: 1px solid #1976d2;
              outline-offset: -1px;
            `,
          }}
          autoFocus
          inputProps={{ style: { height: '100%', padding: 0 } }}
          onKeyDown={(e) => {
            if (e.keyCode === 229) {
              return;
            }
            if (e.key === 'Escape') {
              setValue(children);
              setEditing(false);
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
        children
      )}
    </TreeItem>
  );
}

function TreeItem({
  icon,
  children,
  depth = 0,
  actions,
  ...props
}: {
  icon?: ReactNode;
  children?: ReactNode;
  depth?: number;
  actions?: ReactNode;
} & BoxProps) {
  const [open, setOpen] = useState(false);

  return (
    <Box
      sx={{
        my: 0.5,
        position: 'relative',
        ':hover': {
          '.item': { bgcolor: 'grey.100' },
          '.hover-visible': { opacity: 1 },
        },
      }}>
      <Box
        className="item"
        {...props}
        sx={{
          borderRadius: 1,
          mx: 1,
          position: 'relative',
          pl: depth * 2 + 1,
          pr: 1,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          ...props.sx,
          bgcolor: open ? 'grey.100' : (props.sx as any)?.bgcolor,
        }}>
        <Box sx={{ width: 32, display: 'flex', alignItems: 'center' }}>{icon}</Box>

        <Box
          sx={{
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
          {children}
        </Box>
      </Box>

      {actions && (
        <Stack
          component="span"
          className="hover-visible"
          justifyContent="center"
          sx={{ position: 'absolute', right: 8, top: 0, bottom: 0, opacity: open ? 1 : 0 }}>
          <Tooltip
            open={open}
            placement="right-start"
            onClose={() => setOpen(false)}
            disableFocusListener
            disableHoverListener
            disableTouchListener
            componentsProps={{
              tooltip: { sx: { bgcolor: 'grey.100', boxShadow: 1, m: 0, p: 0.5 } },
            }}
            title={
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <List
                  disablePadding
                  dense
                  sx={{
                    color: 'text.primary',
                    [`.${listItemButtonClasses.root}`]: {
                      borderRadius: 1,
                      px: 1,
                      py: '2px',
                    },
                    [`.${listItemIconClasses.root}`]: {
                      minWidth: 32,

                      '> *': {
                        fontSize: 18,
                      },
                    },
                  }}
                  onClick={() => setOpen(false)}>
                  {actions}
                </List>
              </ClickAwayListener>
            }>
            <Button onClick={() => setOpen(true)} sx={{ padding: 0.5, minWidth: 0 }}>
              <MenuVertical sx={{ fontSize: 20 }} />
            </Button>
          </Tooltip>
        </Stack>
      )}
    </Box>
  );
}
