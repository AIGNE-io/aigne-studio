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
} from '@mui/icons-material';
import { Box, BoxProps, Button, CircularProgress, IconButton, Input, Tooltip, Typography } from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import produce from 'immer';
import { omit } from 'lodash';
import {
  Dispatch,
  ReactNode,
  SetStateAction,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DndProvider } from 'react-dnd';

import { TemplateInput } from '../../../api/src/routes/templates';
import { Folder } from '../../../api/src/store/folders';
import { Template } from '../../../api/src/store/templates';
import { getErrorMessage } from '../../libs/api';
import * as foldersApi from '../../libs/folders';
import { importTemplates } from '../../libs/import';
import { createTemplate, deleteTemplate, getTemplates, updateTemplate } from '../../libs/templates';

export default function TemplateList({
  current,
  onCreate,
  onDelete,
  onClick,
  onLaunch,
  onExport,
  ...props
}: {
  current?: Template;
  onCreate?: (input?: TemplateInput) => void;
  onDelete?: (template: Template) => void;
  onClick?: (template: Template) => void;
  onLaunch?: (template: Template) => void;
  onExport?: (node: TreeNode) => void;
} & Omit<BoxProps, 'onClick'>) {
  const { t } = useLocaleContext();
  const { loading, tree, treeRef, createFolder, removeFolder, updateFolder, update, refetch } = useTemplates();
  const [newFolder, setNewFolder] = useState<Folder>();

  useEffect(() => {
    if (!treeRef.current.length) {
      refetch();
    }
  }, []);

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

        <IconButton
          size="small"
          color="primary"
          onClick={async () => {
            try {
              setNewFolder(await createFolder());
            } catch (error) {
              Toast.error(getErrorMessage(error));
              throw error;
            }
          }}>
          <CreateNewFolderOutlined fontSize="small" />
        </IconButton>

        {onCreate && (
          <IconButton size="small" color="primary" onClick={() => onCreate()}>
            <Add fontSize="small" />
          </IconButton>
        )}
      </Box>

      {!tree.length &&
        (loading ? (
          <Box textAlign="center">
            <CircularProgress size={20} />
          </Box>
        ) : (
          <Box color="text.secondary" textAlign="center">
            {t('alert.noTemplates')}
          </Box>
        ))}

      <DndProvider backend={MultiBackend} options={getBackendOptions()}>
        <Tree
          tree={tree}
          rootId="/"
          initialOpen={openIds}
          onChangeOpen={setOpenIds}
          canDrag={(node) => !!node?.data}
          onDrop={async (_, { dragSource, dropTarget }) => {
            if (dragSource) {
              await update(dragSource.id as string, { folderId: (dropTarget?.id as string) ?? null });
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

            if (node.data.type === 'folder') {
              return (
                <FolderTreeItem
                  text={node.text}
                  depth={depth}
                  isOpen={isOpen}
                  onToggle={onToggle}
                  onSubmit={async (name) => {
                    await updateFolder(node.id as any, { name });
                  }}
                  defaultEditing={newFolder?._id === node.id && !node.text}
                  actions={
                    <>
                      {onExport && (
                        <Tooltip title="Export">
                          <span>
                            <Button disabled={!hasChild} size="small" onClick={() => onExport(node)}>
                              <Download fontSize="small" />
                            </Button>
                          </span>
                        </Tooltip>
                      )}
                      {onCreate && (
                        <Tooltip title="New Template">
                          <Button size="small" onClick={() => onCreate({ folderId: node.id as any })}>
                            <Add fontSize="small" />
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip title="Delete">
                        <Button size="small" onClick={() => removeFolder(node.id as any)}>
                          <DeleteForever fontSize="small" />
                        </Button>
                      </Tooltip>
                    </>
                  }
                />
              );
            }

            const selected = current?._id === node.data.data._id;
            const template = node.data.data;

            return (
              <TemplateTreeItem
                depth={depth}
                template={template}
                sx={{ bgcolor: selected ? 'rgba(0,0,0,0.05)' : undefined }}
                onClick={() => onClick?.(template)}
                actions={
                  <>
                    {onLaunch && (
                      <Tooltip title="Open in Assistant">
                        <Button size="small" onClick={() => onLaunch(template)}>
                          <Launch fontSize="small" />
                        </Button>
                      </Tooltip>
                    )}

                    {onExport && (
                      <Tooltip title="Export">
                        <Button size="small" onClick={() => onExport(node)}>
                          <Download fontSize="small" />
                        </Button>
                      </Tooltip>
                    )}

                    {onCreate && (
                      <Tooltip title="Duplicate">
                        <Button
                          size="small"
                          onClick={() =>
                            onCreate({
                              ...omit(template, '_id', 'createdAt', 'updatedAt'),
                              name: `${template.name || template._id} Copy`,
                            })
                          }>
                          <CopyAll fontSize="small" />
                        </Button>
                      </Tooltip>
                    )}

                    {onDelete && (
                      <Tooltip title="Delete">
                        <Button size="small" onClick={() => onDelete(template)}>
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

export type TreeNode = NodeModel<{ type: 'template'; data: Template } | { type: 'folder'; data: Folder }>;

export interface TemplatesContext {
  templates: Template[];
  tree: TreeNode[];
  loading: boolean;
  submiting: boolean;
  error?: Error;
}

const templatesContext = createContext<TemplatesContext & { setState: Dispatch<SetStateAction<TemplatesContext>> }>({
  templates: [],
  tree: [],
  loading: false,
  submiting: false,
  setState: () => {},
});

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TemplatesContext>({
    templates: [],
    tree: [],
    loading: true,
    submiting: false,
  });

  const value = useMemo(() => ({ ...state, setState }), [state, setState]);

  return <templatesContext.Provider value={value}>{children}</templatesContext.Provider>;
}

export function useTemplates() {
  const { setState, ...state } = useContext(templatesContext);

  const treeRef = useRef(state.tree);
  treeRef.current = state.tree;

  const refetch = useCallback(async () => {
    setState((state) => ({ ...state, loading: true }));
    try {
      const [{ templates }, { folders }] = await Promise.all([
        getTemplates({ limit: 100, sort: '-createdAt' }),
        foldersApi.getFolders(),
      ]);
      const folderIds = new Set(folders.map((i) => i._id));
      setState((state) => {
        const newState = produce(state, (draft) => {
          draft.templates.splice(0, draft.templates.length, ...templates);
          const f: typeof state.tree = folders.map((i) => ({
            id: i._id!,
            parent: '/',
            text: i.name || '',
            droppable: true,
            data: { type: 'folder', data: i },
          }));
          const t: typeof state.tree = templates.map((i) => ({
            id: i._id,
            parent: i.folderId && folderIds.has(i.folderId) ? i.folderId : '/',
            text: i.name || i._id,
            droppable: false,
            data: { type: 'template', data: i },
          }));
          draft.tree = f.concat(t);
        });
        treeRef.current = newState.tree;
        return newState;
      });
    } catch (error) {
      setState((state) => ({ ...state, error }));
      throw error;
    } finally {
      setState((state) => ({ ...state, loading: false }));
    }
  }, []);

  const create = useCallback(async (template: TemplateInput) => {
    setState((state) => ({ ...state, submiting: true }));
    try {
      const res = await createTemplate(template);
      await refetch();
      return res;
    } finally {
      setState((state) => ({ ...state, submiting: false }));
    }
  }, []);

  const update = useCallback(async (templateId: string, template: TemplateInput) => {
    setState((state) => ({ ...state, submiting: true }));
    try {
      const res = await updateTemplate(templateId, template);
      await refetch();
      return res;
    } finally {
      setState((state) => ({ ...state, submiting: false }));
    }
  }, []);

  const remove = useCallback(async (templateId: string) => {
    setState((state) => ({ ...state, submiting: true }));
    try {
      const res = await deleteTemplate(templateId);
      await refetch();
      return res;
    } finally {
      setState((state) => ({ ...state, submiting: false }));
    }
  }, []);

  const createFolder = useCallback(async (folder?: foldersApi.FolderInput) => {
    setState((state) => ({ ...state, submiting: true }));
    try {
      const res = await foldersApi.createFolder(folder);
      await refetch();
      return res;
    } finally {
      setState((state) => ({ ...state, submiting: false }));
    }
  }, []);

  const updateFolder = useCallback(async (folderId: string, folder: foldersApi.FolderInput) => {
    setState((state) => ({ ...state, submiting: true }));
    try {
      const res = await foldersApi.updateFolder(folderId, folder);
      await refetch();
      return res;
    } finally {
      setState((state) => ({ ...state, submiting: false }));
    }
  }, []);

  const removeFolder = useCallback(async (folderId: string) => {
    setState((state) => ({ ...state, submiting: true }));
    try {
      const res = await foldersApi.deleteFolder(folderId);
      await refetch();
      return res;
    } finally {
      setState((state) => ({ ...state, submiting: false }));
    }
  }, []);

  const importTemplatesFn = useCallback(
    async ({ folders, templates }: { folders?: Folder[]; templates?: Template[] }) => {
      setState((state) => ({ ...state, submiting: true }));
      try {
        await importTemplates({ folders, templates });
        await refetch();
      } finally {
        setState((state) => ({ ...state, submiting: false }));
      }
    },
    []
  );

  return {
    ...state,
    treeRef,
    refetch,
    create,
    update,
    remove,
    createFolder,
    updateFolder,
    removeFolder,
    importTemplates: importTemplatesFn,
  };
}

function FolderTreeItem({
  text,
  isOpen,
  depth,
  actions,
  defaultEditing,
  onToggle,
  onSubmit,
}: {
  text: string;
  isOpen: boolean;
  depth: number;
  actions?: ReactNode;
  defaultEditing?: boolean;
  onToggle: () => void;
  onSubmit: (name: string) => Promise<any>;
}) {
  const [editing, setEditing] = useState(defaultEditing);
  const [value, setValue] = useState(text);

  const [open, setOpen] = useState(false);

  const submit = async () => {
    if (!value) {
      setEditing(false);
      setValue(text);
      return;
    }

    try {
      await onSubmit(value);
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
        pl: depth * 2,
        display: 'flex',
        alignItems: 'center',
        ':hover': { '.hover-visible': { opacity: 1 } },
      }}
      onClick={onToggle}>
      <Box
        sx={{
          fontSize: 16,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 20,
          height: 20,
        }}>
        {isOpen ? <KeyboardArrowDown fontSize="inherit" /> : <KeyboardArrowRight fontSize="inherit" />}
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
        <Tooltip
          onClick={(e) => e.stopPropagation()}
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
              <Tooltip title="Rename">
                <Button size="small" onClick={() => setEditing(true)}>
                  <Edit fontSize="small" />
                </Button>
              </Tooltip>

              {actions}
            </Box>
          }>
          <Button
            className="hover-visible"
            sx={{ padding: 0.5, minWidth: 0, position: 'absolute', right: 4, opacity: open ? 1 : 0 }}>
            <MoreVert sx={{ fontSize: 16 }} />
          </Button>
        </Tooltip>
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
    }[template.type]) || { icon: 'tabler:prompt', color: 'primary.main' };

  const [open, setOpen] = useState(false);

  return (
    <Box
      {...props}
      sx={{
        position: 'relative',
        pl: depth * 2,
        display: 'flex',
        alignItems: 'center',
        ':hover': { '.hover-visible': { opacity: 1 } },
        ...props.sx,
      }}>
      <Box sx={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box component={Icon} icon={icon} sx={{ fontSize: 16, color }} />
      </Box>
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
          <Button
            className="hover-visible"
            sx={{ padding: 0.5, minWidth: 0, position: 'absolute', right: 4, opacity: open ? 1 : 0 }}>
            <MoreVert sx={{ fontSize: 16 }} />
          </Button>
        </Tooltip>
      )}
    </Box>
  );
}
