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
import { Box, BoxProps, Button, CircularProgress, IconButton, Input, Tooltip, Typography } from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import { omit } from 'lodash';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';

import { TemplateInput } from '../../../api/src/routes/templates';
import { EntryWithMeta } from '../../../api/src/routes/tree';
import { Template } from '../../../api/src/store/templates';
import { getErrorMessage } from '../../libs/api';
import { useProjectState } from './state';

export type TreeNode = NodeModel<EntryWithMeta>;

export default function FileTree({
  _ref: ref,
  current,
  onCreate,
  onDelete,
  onClick,
  onLaunch,
  onExport,
  onImport,
  onRemoveFolder,
  ...props
}: {
  _ref: string;
  current?: string;
  onCreate?: (input?: TemplateInput, path?: string[]) => any;
  onDelete?: (template: Template, path: string[]) => void;
  onClick?: (template: Template, path: string[]) => void;
  onLaunch?: (template: Template) => void;
  onExport?: (node: TreeNode) => void;
  onImport?: (path: string[]) => void;
  onRemoveFolder?: (path: string[], children: TreeNode[]) => void;
} & Omit<BoxProps, 'onClick'>) {
  const { t } = useLocaleContext();

  const {
    state: { files, loading, error },
    refetch,
    createFile,
    moveFile,
  } = useProjectState(ref);
  if (error) throw error;

  const tree = useMemo<TreeNode[]>(() => {
    if (!files) return [];

    return files.map((item) => ({
      id: item.name,
      parent: item.parent.join('-'),
      text: item.name,
      droppable: item.type === 'folder',
      data: item,
    }));
  }, [files]);

  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const [openIds, setOpenIds] = useLocalStorageState<(string | number)[]>('ai-studio.tree.openIds');

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

        <IconButton size="small" color="primary" onClick={() => setShowNewProject(true)}>
          <CreateNewFolderOutlined fontSize="small" />
        </IconButton>

        {onCreate && (
          <IconButton size="small" color="primary" onClick={() => onCreate({}, [])}>
            <Add fontSize="small" />
          </IconButton>
        )}
      </Box>

      {!files.length &&
        (loading ? (
          <Box textAlign="center">
            <CircularProgress size={20} />
          </Box>
        ) : (
          <Box color="text.secondary" textAlign="center">
            {t('alert.noTemplates')}
          </Box>
        ))}

      {showNewProject && (
        <FolderTreeItem
          key={showNewProject.toString()}
          text=""
          defaultEditing
          onSubmit={async (value) => {
            const name = value.trim();
            if (name) await createFile({ branch: 'main', path: '', input: { type: 'folder', data: { name } } });
            setShowNewProject(false);
          }}
          onCancel={() => setShowNewProject(false)}
        />
      )}

      <DndProvider backend={MultiBackend} options={getBackendOptions()}>
        <Tree
          tree={tree}
          rootId=""
          initialOpen={openIds}
          onChangeOpen={setOpenIds}
          canDrag={(node) => node?.data?.type === 'file'}
          onDrop={async (_, { dragSource, dropTarget }) => {
            const source = dragSource?.data;
            if (source) {
              const src = source.parent.concat(source.name).join('/');
              const dst = (dropTarget?.data?.parent ?? [])
                .concat(dropTarget?.data?.name || '')
                .concat(source.name)
                .join('/');

              await moveFile({ branch: 'main', path: src, to: dst });
              if (dropTarget && !openIds.includes(dropTarget.id)) {
                setOpenIds((ids) => (ids ?? []).concat(dropTarget.id));
              }
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
          render={(node, { depth, isOpen, onToggle, hasChild }) => {
            if (!node.data) {
              return <Box />;
            }

            const { parent, name } = node.data;
            const path = parent.concat(name);

            if (node.data.type === 'folder') {
              return (
                <FolderTreeItem
                  key={node.id}
                  text={node.text}
                  depth={depth}
                  isOpen={isOpen}
                  onToggle={onToggle}
                  onSubmit={async (name) => {
                    const { data } = node;
                    if (!data || name === data.name) return;
                    await moveFile({
                      branch: 'main',
                      path: data.parent.concat(data.name).join('/'),
                      to: data.parent.concat(name).join('/'),
                    });
                  }}
                  actions={
                    <>
                      {onExport && (
                        <Tooltip title={t('alert.export')}>
                          <span>
                            <Button disabled={!hasChild} size="small" onClick={() => onExport(node)}>
                              <Download fontSize="small" />
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      {onImport && (
                        <Tooltip title={t('alert.import')}>
                          <span>
                            <Button size="small" onClick={() => onImport(path)}>
                              <Upload fontSize="small" />
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      {onCreate && (
                        <Tooltip title={`${t('form.add')} ${t('form.template')}`}>
                          <Button
                            size="small"
                            onClick={() => {
                              onCreate({}, path);
                              setOpenIds((ids) => (ids ?? []).concat(node.id));
                            }}>
                            <Add fontSize="small" />
                          </Button>
                        </Tooltip>
                      )}
                      {onRemoveFolder && (
                        <Tooltip title={t('alert.delete')}>
                          <Button
                            size="small"
                            onClick={() =>
                              onRemoveFolder(
                                path,
                                tree.filter((i) => i.parent === node.id)
                              )
                            }>
                            <DeleteForever fontSize="small" />
                          </Button>
                        </Tooltip>
                      )}
                    </>
                  }
                />
              );
            }

            const { meta } = node.data;
            const selected = current && current.endsWith(name);

            return (
              <TemplateTreeItem
                key={node.id}
                depth={depth}
                template={meta}
                sx={{ bgcolor: selected ? 'rgba(0,0,0,0.05)' : undefined }}
                onClick={() => onClick?.(meta, path)}
                actions={
                  <>
                    {onLaunch && (
                      <Tooltip title={t('alert.openInAssistant')}>
                        <Button size="small" onClick={() => onLaunch(meta)}>
                          <Launch fontSize="small" />
                        </Button>
                      </Tooltip>
                    )}

                    {onExport && (
                      <Tooltip title={t('alert.export')}>
                        <Button size="small" onClick={() => onExport(node)}>
                          <Download fontSize="small" />
                        </Button>
                      </Tooltip>
                    )}

                    {onCreate && (
                      <Tooltip title={t('alert.duplicate')}>
                        <Button
                          size="small"
                          onClick={() =>
                            onCreate({
                              ...omit(meta, '_id', 'createdAt', 'updatedAt'),
                              name: `${meta.name || meta.id} Copy`,
                            })
                          }>
                          <CopyAll fontSize="small" />
                        </Button>
                      </Tooltip>
                    )}

                    {onDelete && (
                      <Tooltip title={t('alert.delete')}>
                        <Button size="small" onClick={() => onDelete(meta, path)}>
                          <DeleteForever fontSize="small" />
                        </Button>
                      </Tooltip>
                    )}
                  </>
                }
              />
            );
          }}
        />
      </DndProvider>
    </Box>
  );
}

function FolderTreeItem({
  text,
  isOpen,
  depth = 0,
  actions,
  defaultEditing,
  onToggle,
  onSubmit,
  onCancel,
}: {
  text: string;
  isOpen?: boolean;
  depth?: number;
  actions?: ReactNode;
  defaultEditing?: boolean;
  onToggle?: () => void;
  onSubmit?: (name: string) => any;
  onCancel?: () => any;
}) {
  const { t } = useLocaleContext();
  const [editing, setEditing] = useState(defaultEditing);
  const [value, setValue] = useState(text);

  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (!value) {
      setEditing(false);
      setValue(text);
      onCancel?.();
      return;
    }

    try {
      await onSubmit?.(value);
      setEditing(false);
    } catch (error) {
      setEditing(false);
      setValue(text);
      Toast.error(getErrorMessage(error));
      throw error;
    }
  };

  return (
    <Box
      sx={{
        position: 'relative',
        pl: depth * 2 + 1,
        py: 0.5,
        pr: 2,
        display: 'flex',
        alignItems: 'center',
        cursor: 'pointer',
        ':hover': { bgcolor: 'grey.100', '.hover-visible': { opacity: 1 } },
      }}
      onClick={onToggle}>
      <Box sx={{ height: 20, mr: 0.5 }}>
        {isOpen ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
      </Box>
      <Box sx={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {editing ? (
          <Input
            disableUnderline
            fullWidth
            value={value}
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
                setValue(text);
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
          text || 'Untitled'
        )}
      </Box>

      {!editing && actions && (
        <Box
          component="span"
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
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}>
                <Tooltip title={t('form.rename')}>
                  <Button size="small" onClick={() => setEditing(true)}>
                    <Edit fontSize="small" />
                  </Button>
                </Tooltip>

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

function TemplateTreeItem({
  template,
  depth,
  actions,
  ...props
}: { template: Template; depth: number; actions?: ReactNode } & BoxProps) {
  const { icon, color } = (template.type &&
    {
      branch: { icon: 'fluent:branch-16-regular', color: 'secondary.main' },
      image: { icon: 'fluent:draw-image-20-regular', color: 'success.main' },
    }[template.type]) || { icon: 'tabler:prompt', color: 'primary.main' };

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
      <Box component={Icon} icon={icon} sx={{ fontSize: 20, color, mr: 0.5 }} />
      <Box
        sx={{
          flex: 1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
        {template.name || 'Untitled'}
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
