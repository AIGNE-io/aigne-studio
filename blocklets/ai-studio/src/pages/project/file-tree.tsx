import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { css } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import { MultiBackend, NodeModel, Tree, getBackendOptions } from '@minoru/react-dnd-treeview';
import {
  Add,
  CopyAll,
  CreateNewFolderOutlined,
  DeleteForever,
  Download,
  Edit,
  KeyboardArrowDown,
  KeyboardArrowRight,
  Launch,
  MoreVert,
  Upload,
} from '@mui/icons-material';
import { Box, BoxProps, Button, IconButton, Input, Tooltip, Typography } from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { uniqBy } from 'lodash';
import { ComponentProps, ReactNode, useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { useNavigate } from 'react-router-dom';
import joinUrl from 'url-join';

import { Template } from '../../../api/src/store/templates';
import { getErrorMessage } from '../../libs/api';
import { createFile, createFolder, deleteFile, isTemplate, moveFile, nextTemplateId, useStore } from './yjs-state';

export type EntryWithMeta =
  | {
      type: 'file';
      name: string;
      filename: string;
      parent: string[];
      path: string[];
      meta: Template;
    }
  | {
      type: 'folder';
      name: string;
      filename: string;
      parent: string[];
      path: string[];
    };

export type TreeNode = NodeModel<EntryWithMeta>;

export default function FileTree({
  current,
  mutable,
  onExport,
  onImport,
  onLaunch,
  ...props
}: {
  current?: string;
  mutable?: boolean;
  onExport?: (path: string[]) => any;
  onImport?: (path: string[]) => any;
  onLaunch?: (template: Template) => any;
} & Omit<BoxProps, 'onClick'>) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();

  const { store } = useStore();

  const [openIds, setOpenIds] = useLocalStorageState<(string | number)[]>('ai-studio.tree.openIds');

  const [showNewProject, setShowNewProject] = useState(false);

  const onCreateFile = useCallback(
    ({ parent, meta }: { parent?: string[]; meta?: Template } = {}) => {
      const { filepath } = createFile({ store, parent, meta });
      if (parent) setOpenIds((ids) => (ids ?? []).concat(parent.join('/')));
      navigate(filepath);
    },
    [navigate, setOpenIds, store]
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

  return (
    <Box {...props}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 2,
          py: 1,
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.paper',
        }}>
        <Typography variant="subtitle1" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {t('main.templates')}
        </Typography>

        <IconButton disabled={!mutable} size="small" color="primary" onClick={() => setShowNewProject(true)}>
          <CreateNewFolderOutlined fontSize="small" />
        </IconButton>

        <IconButton disabled={!mutable} size="small" color="primary" onClick={() => onCreateFile()}>
          <Add fontSize="small" />
        </IconButton>
      </Box>

      {showNewProject && (
        <EditableTreeItem
          icon={<KeyboardArrowRight fontSize="small" />}
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
        <Box color="text.secondary" textAlign="center">
          {t('alert.noTemplates')}
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
                onExport={onExport}
                onLaunch={onLaunch}
                onImport={onImport}
              />
            );

            const { parent } = node.data;
            const filepath = parent.concat(node.data.type === 'file' ? `${node.data.meta.id}.yaml` : node.data.name);

            if (node.data.type === 'folder') {
              return (
                <EditableTreeItem
                  key={node.id}
                  icon={isOpen ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
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

            const { icon, color } = (meta.type &&
              {
                branch: { icon: 'fluent:branch-16-regular', color: 'secondary.main' },
                image: { icon: 'fluent:draw-image-20-regular', color: 'success.main' },
              }[meta.type]) || { icon: 'tabler:prompt', color: 'primary.main' };

            return (
              <TreeItem
                key={node.id}
                icon={<Box component={Icon} icon={icon} color={color} />}
                depth={depth}
                sx={{ bgcolor: selected ? 'rgba(0,0,0,0.05)' : undefined }}
                onClick={() => navigate(filepath.join('/'))}
                actions={actions}>
                {meta.name || t('alert.unnamed')}
              </TreeItem>
            );
          }}
        />
      </DndProvider>
    </Box>
  );
}

function TreeItemMenus({
  mutable,
  item,
  onCreateFile,
  onDeleteFile,
  onExport,
  onLaunch,
  onImport,
}: {
  mutable?: boolean;
  item: EntryWithMeta;
  onCreateFile?: (options?: { parent?: string[]; meta?: Template }) => any;
  onDeleteFile?: (options: { path: string[] }) => any;
  onExport?: (path: string[]) => any;
  onLaunch?: (template: Template) => any;
  onImport?: (path: string[]) => any;
}) {
  const { t } = useLocaleContext();

  return (
    <>
      {onLaunch && item.type === 'file' && (
        <Tooltip title={t('alert.openInAssistant')}>
          <span>
            <Button size="small" onClick={() => onLaunch(item.meta)}>
              <Launch fontSize="small" />
            </Button>
          </span>
        </Tooltip>
      )}

      {onExport && (
        <Tooltip title={t('alert.export')}>
          <span>
            <Button size="small" onClick={() => onExport(item.path)}>
              <Download fontSize="small" />
            </Button>
          </span>
        </Tooltip>
      )}

      {onImport && item.type === 'folder' && (
        <Tooltip title={t('alert.import')}>
          <span>
            <Button disabled={!mutable} size="small" onClick={() => onImport(item.path)}>
              <Upload fontSize="small" />
            </Button>
          </span>
        </Tooltip>
      )}

      {item.type === 'folder' && onCreateFile && (
        <Tooltip title={`${t('form.add')} ${t('form.template')}`}>
          <span>
            <Button disabled={!mutable} size="small" onClick={() => onCreateFile({ parent: item.path })}>
              <Add fontSize="small" />
            </Button>
          </span>
        </Tooltip>
      )}

      {item.type === 'file' && onCreateFile && (
        <Tooltip title={t('alert.duplicate')}>
          <span>
            <Button
              disabled={!mutable}
              size="small"
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
              <CopyAll fontSize="small" />
            </Button>
          </span>
        </Tooltip>
      )}

      {onDeleteFile && (
        <Tooltip title={t('alert.delete')}>
          <span>
            <Button disabled={!mutable} size="small" onClick={() => onDeleteFile(item)}>
              <DeleteForever fontSize="small" />
            </Button>
          </span>
        </Tooltip>
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
        <>
          <Tooltip title={t('form.rename')}>
            <span>
              <Button disabled={!mutable} size="small" onClick={() => setEditing(true)}>
                <Edit fontSize="small" />
              </Button>
            </span>
          </Tooltip>

          {props.actions}
        </>
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
      {...props}
      sx={{
        position: 'relative',
        pl: depth * 2 + 1,
        pr: 2,
        py: 0.5,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        ':hover': { bgcolor: 'grey.100', '.hover-visible': { opacity: 1 } },
        ...props.sx,
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

      {actions && (
        <Box
          component="span"
          className="hover-visible"
          sx={{ position: 'absolute', right: 4, opacity: open ? 1 : 0 }}
          onClick={(e) => e.stopPropagation()}>
          <Tooltip
            open={open}
            placement="right"
            onOpen={() => setOpen(true)}
            onClose={() => setOpen(false)}
            disableTouchListener
            disableFocusListener
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: 'grey.100',
                  boxShadow: 1,
                },
              },
            }}
            title={
              <Box
                sx={{
                  '.MuiButtonBase-root': {
                    px: 0.5,
                    minWidth: 0,
                  },
                }}
                onClick={() => setOpen(false)}>
                {actions}
              </Box>
            }>
            <Button sx={{ padding: 0.5, minWidth: 0 }}>
              <MoreVert sx={{ fontSize: 16 }} />
            </Button>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
