import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { css } from '@emotion/css';
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
  Input,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  StackProps,
  Tooltip,
  Typography,
  accordionSummaryClasses,
  listItemButtonClasses,
  listItemIconClasses,
  svgIconClasses,
  tooltipClasses,
  useTheme,
} from '@mui/material';
import { useLocalStorageState } from 'ahooks';
import uniqBy from 'lodash/uniqBy';
import { nanoid } from 'nanoid';
import {
  ComponentProps,
  ReactNode,
  SyntheticEvent,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DndProvider } from 'react-dnd';
import { useNavigate } from 'react-router-dom';
import joinUrl from 'url-join';

import { TemplateYjs } from '../../../api/src/store/projects';
import AwarenessIndicator from '../../components/awareness/awareness-indicator';
import { getErrorMessage } from '../../libs/api';
import { importTemplatesToProject } from '../../libs/project';
import useDialog from '../../utils/use-dialog';
import Add from './icons/add';
import ChevronDown from './icons/chevron-down';
import Duplicate from './icons/duplicate';
import External from './icons/external';
import File from './icons/file';
import FolderClose from './icons/folder-close';
import MenuVertical from './icons/menu-vertical';
import Pen from './icons/pen';
import Picture from './icons/picture';
import Trash from './icons/trash';
import Undo from './icons/undo';
import ImportFrom from './import';
import { useTemplatesChangesState } from './state';
import {
  createFile,
  createFolder,
  deleteFile,
  isTemplate,
  moveFile,
  nextTemplateId,
  resetTemplatesId,
  templateYjsFromTemplate,
  useStore,
} from './yjs-state';

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
  importFrom: () => void;
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
  const theme = useTheme();
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const { dialog, showDialog } = useDialog();

  const { store, synced } = useStore(projectId, gitRef);
  const { changes, deleted } = useTemplatesChangesState(projectId, gitRef);

  const [openIds, setOpenIds] = useLocalStorageState<(string | number)[]>('ai-studio.tree.openIds');

  const [showNewProject, setShowNewProject] = useState(false);

  const onCreateFile = useCallback(
    ({ parent, meta }: { parent?: string[]; meta?: TemplateYjs } = {}) => {
      const promptId = nanoid();

      const { filepath } = createFile({
        store,
        parent,
        meta: {
          ...meta,
          prompts: meta?.prompts ?? {
            [promptId]: {
              index: 0,
              data: {
                id: promptId,
                role: 'user',
              },
            },
          },
        },
      });
      if (parent) setOpenIds((ids) => (ids ?? []).concat(parent.join('/')));
      navigate(filepath);
    },
    [navigate, setOpenIds, store]
  );

  const onImportFrom = useCallback(() => {
    const state: {
      resources: string[];
      projectId: string;
      ref: string;
    } = {
      resources: [],
      projectId: '',
      ref: '',
    };

    showDialog({
      fullWidth: true,
      maxWidth: 'sm',
      title: `${t('import.title')}`,
      content: (
        <Box maxHeight={500}>
          <ImportFrom
            projectId={projectId}
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
          const { templates } = await importTemplatesToProject(projectId, gitRef, state);

          if (templates.length) {
            const newTemplates = resetTemplatesId(templates);
            for (const template of newTemplates) {
              createFile({ store, parent: template.parent || [], meta: templateYjsFromTemplate(template) });
            }
          } else {
            Toast.error('import.selectTemplates');
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
      newFolder: () => setShowNewProject(true),
      newFile: () => onCreateFile(),
      importFrom: () => onImportFrom(),
    }),
    [onCreateFile, onImportFrom]
  );

  const onMoveFile = useCallback(
    ({ from, to }: { from: string[]; to: string[] }) => {
      moveFile({ store, from, to });

      setOpenIds((ids) => [...new Set((ids ?? []).concat(to.slice(0, -1).join('/')))]);

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
    <>
      <Box {...props}>
        {showNewProject && (
          <EditableTreeItem
            icon={<ChevronDown sx={{ transform: 'rotateZ(-90deg)' }} />}
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
          <Box color="text.disabled" textAlign="center" fontSize={14} lineHeight="28px" m={0.5}>
            <Typography variant="caption">{t('noFiles')}</Typography>
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
                padding-bottom: ${theme.spacing(10)};
              `,
              dropTarget: css`
                background-color: ${theme.palette.action.hover};
              `,
            }}
            listComponent="div"
            listItemComponent="div"
            dragPreviewRender={DragPreviewRender}
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
                    icon={<ChevronDown sx={{ transform: `rotateZ(${isOpen ? '0' : '-90deg'})` }} />}
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
              const selected = current?.endsWith(name);

              const change = changes(meta);

              const icon = meta.type === 'image' ? <Picture /> : <File />;

              const children = (
                <TreeItem
                  key={node.id}
                  icon={icon}
                  depth={depth}
                  selected={selected}
                  onClick={() => navigate(filepath.join('/'))}
                  actions={actions}
                  sx={{ color: change?.color }}>
                  {meta.name || t('alert.unnamed')}

                  <AwarenessIndicator
                    projectId={projectId}
                    gitRef={gitRef}
                    path={[meta.id]}
                    sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}
                  />
                </TreeItem>
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
          changes={changes}
          projectId={projectId}
          gitRef={gitRef}
          onCreateFile={onCreateFile}
        />
      )}

      {dialog}
    </>
  );
});

export default FileTree;

function DragPreviewRender({ item }: DragLayerMonitorProps<EntryWithMeta>) {
  const { t } = useLocaleContext();

  return (
    <Stack
      direction="row"
      alignItems="center"
      sx={{
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
        {item.data?.type === 'folder' ? <FolderClose /> : item.data?.meta.type === 'image' ? <Picture /> : <File />}
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
  selected,
  otherActions,
  ...props
}: {
  icon?: ReactNode;
  children?: ReactNode;
  depth?: number;
  actions?: ReactNode;
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
      direction="row"
      sx={{
        mx: 1,
        minHeight: 28,
        borderRadius: 1,
        bgcolor: selected ? 'action.selected' : open ? 'action.hover' : undefined,
        ':hover': {
          bgcolor: selected ? 'action.selected' : 'action.hover',
          '.hover-visible': { maxWidth: '100%' },
        },
      }}>
      <Stack
        ref={ref}
        {...props}
        direction="row"
        alignItems="center"
        sx={{
          position: 'relative',
          pl: depth * 2 + 1,
          pr: 1,
          flex: 1,
          cursor: 'pointer',
          overflow: 'hidden',
          ...props.sx,
        }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            width: (theme) => theme.spacing(3),
            [`.${svgIconClasses.root}`]: { fontSize: '1.25rem', color: 'text.secondary' },
          }}>
          {icon}
        </Box>

        <Box
          sx={{
            flex: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
          {children}
        </Box>
      </Stack>

      <Box display="flex" alignItems="center">
        {actions && (
          <Stack
            component="span"
            className="hover-visible"
            justifyContent="center"
            alignItems="flex-end"
            overflow="hidden"
            sx={{ maxWidth: open ? '100%' : 0 }}>
            <Tooltip
              open={open}
              placement="right-start"
              onClose={() => setOpen(false)}
              disableFocusListener
              disableHoverListener
              disableTouchListener
              componentsProps={{
                popper: {
                  sx: {
                    [`&.${tooltipClasses.popper}[data-popper-placement*="left"] .${tooltipClasses.tooltip}`]: {
                      mr: 1,
                    },
                    [`&.${tooltipClasses.popper}[data-popper-placement*="right"] .${tooltipClasses.tooltip}`]: {
                      ml: 1,
                    },
                  },
                },
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
              <Button
                onClick={() => setOpen(true)}
                sx={{ padding: 0.5, minWidth: 0, bgcolor: open ? 'action.hover' : undefined }}>
                <MenuVertical sx={{ fontSize: 20 }} />
              </Button>
            </Tooltip>
          </Stack>
        )}

        {otherActions && (
          <Box display="flex" alignItems="center">
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
}: {
  projectId: string;
  gitRef: string;
  list: (TemplateYjs & { parent: string[] })[];
  changes: (item: TemplateYjs) => {
    key: string;
    color: string;
    tips: string;
  } | null;
  onCreateFile: ({ parent, meta }: { parent?: string[]; meta?: TemplateYjs }) => void;
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
          [`.${accordionSummaryClasses.content}`]: {
            m: 0,
            py: 0,
            overflow: 'hidden',
            alignItems: 'center',
          },
        }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            minWidth: (theme) => theme.spacing(3),
          }}>
          <ChevronDown
            sx={{
              fontSize: 20,
              transform: `rotateZ(${expanded ? '0' : '-90deg'})`,
              transition: (theme) => theme.transitions.create('all'),
            }}
          />
        </Box>

        <Typography variant="caption" flex={1} noWrap overflow="hidden" textOverflow="ellipsis">
          {t('diff.deleted')}
        </Typography>
      </AccordionSummary>

      <AccordionDetails sx={{ py: 1, px: 0 }}>
        <Box maxHeight="120px" overflow="auto">
          {list.map((item) => {
            const icon = item.type === 'image' ? <Picture /> : <File />;

            const change = changes(item);
            if (!change) return null;

            return (
              <TreeItem
                key={item.id}
                icon={icon}
                depth={0}
                otherActions={
                  <Tooltip title={t('restore')} disableInteractive placement="top">
                    <Button
                      sx={{ padding: 0.5, minWidth: 0 }}
                      onClick={() => {
                        const { parent, ...meta } = item;
                        onCreateFile({ parent, meta });
                      }}>
                      <Undo sx={{ fontSize: 20 }} />
                    </Button>
                  </Tooltip>
                }>
                <Box sx={{ textDecoration: 'line-through', display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                  {!!item.parent?.length && (
                    <Box
                      sx={{
                        color: (theme) => theme.palette.action.disabled,
                      }}>{`${item.parent.join('/ ')}/`}</Box>
                  )}
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
