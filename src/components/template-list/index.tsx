import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { css } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import { Add, CopyAll, DeleteForever, Launch } from '@mui/icons-material';
import {
  Box,
  BoxProps,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
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
  useState,
} from 'react';

import { TemplateInput } from '../../../api/src/routes/templates';
import { Template } from '../../../api/src/store/templates';
import { createTemplate, deleteTemplate, getTemplates, updateTemplate } from '../../libs/templates';

export default function TemplateList({
  templates,
  loading,
  current,
  onCreate,
  onDelete,
  onClick,
  onLaunch,
  ...props
}: {
  templates: Template[];
  loading?: boolean;
  current?: Template;
  onCreate?: (input?: TemplateInput) => void;
  onDelete?: (template: Template) => void;
  onClick?: (template: Template) => void;
  onLaunch?: (template: Template) => void;
} & Omit<BoxProps, 'onClick'>) {
  const { t } = useLocaleContext();

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
        <Typography variant="subtitle1" sx={{ flex: 1 }}>
          {t('main.templates')}
        </Typography>

        {onCreate && (
          <IconButton size="small" color="primary" onClick={() => onCreate()}>
            <Add fontSize="small" />
          </IconButton>
        )}
      </Box>

      <List disablePadding>
        {templates.map((template) => {
          const { icon, color } = (template.type &&
            {
              branch: { icon: 'fluent:branch-16-regular', color: 'secondary.main' },
            }[template.type]) || { icon: 'tabler:prompt', color: 'primary.main' };

          return (
            <ListItem
              key={template._id}
              disablePadding
              className={css`
                > .MuiListItemButton-root {
                  padding-right: 16px;
                }

                > .MuiListItemSecondaryAction-root {
                  top: 0;
                  right: 0;
                  transform: none;
                  background-color: rgba(240, 240, 240, 0.8);
                  border-radius: 4px;
                  display: none;

                  > .MuiButton-root {
                    min-width: 0;
                    padding: 4px 2px;
                  }
                }

                &:hover {
                  > .MuiListItemButton-root {
                    padding-right: 32px;
                  }

                  > .MuiListItemSecondaryAction-root {
                    display: block;
                  }
                }
              `}
              secondaryAction={
                <>
                  {onLaunch && (
                    <Button size="small" onClick={() => onLaunch(template)}>
                      <Launch fontSize="small" />
                    </Button>
                  )}

                  {onCreate && (
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
                  )}

                  {onDelete && (
                    <Button size="small" onClick={() => onDelete(template)}>
                      <DeleteForever fontSize="small" />
                    </Button>
                  )}
                </>
              }>
              <ListItemButton selected={current?._id === template._id} onClick={() => onClick?.(template)}>
                <ListItemText
                  primary={
                    <>
                      <Box component={Icon} icon={icon} sx={{ mr: 0.5, fontSize: 14, color }} />
                      {template.name || template._id}
                    </>
                  }
                  primaryTypographyProps={{ noWrap: true }}
                  secondary={template.description}
                  secondaryTypographyProps={{
                    sx: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}

        {loading ? (
          <Box textAlign="center">
            <CircularProgress size={20} />
          </Box>
        ) : (
          templates.length === 0 && (
            <ListItem>
              <ListItemText
                primary={t('alert.noTemplates')}
                primaryTypographyProps={{ color: 'text.secondary', textAlign: 'center' }}
              />
            </ListItem>
          )
        )}
      </List>
    </Box>
  );
}

export interface TemplatesContext {
  templates: Template[];
  loading: boolean;
  submiting: boolean;
  error?: Error;
}

const templatesContext = createContext<TemplatesContext & { setState: Dispatch<SetStateAction<TemplatesContext>> }>({
  templates: [],
  loading: false,
  submiting: false,
  setState: () => {},
});

export function TemplatesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TemplatesContext>({
    templates: [],
    loading: false,
    submiting: false,
  });

  const value = useMemo(() => ({ ...state, setState }), [state, setState]);

  return <templatesContext.Provider value={value}>{children}</templatesContext.Provider>;
}

export function useTemplates() {
  const { setState, ...state } = useContext(templatesContext);

  const refetch = useCallback(async () => {
    setState((state) => ({ ...state, loading: true }));
    try {
      const res = await getTemplates({ limit: 100, sort: '-createdAt' });
      setState((state) =>
        produce(state, (draft) => {
          draft.templates.splice(0, draft.templates.length, ...res.templates);
        })
      );
    } catch (error) {
      setState((state) => ({ ...state, error }));
      throw error;
    } finally {
      setState((state) => ({ ...state, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (!state.templates.length) {
      refetch();
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

  return { ...state, refetch, create, update, remove };
}
