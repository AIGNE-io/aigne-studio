import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { css } from '@emotion/css';
import { Add, DeleteForever } from '@mui/icons-material';
import {
  Box,
  BoxProps,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
} from '@mui/material';
import produce from 'immer';
import { useCallback, useEffect, useState } from 'react';

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
  ...props
}: {
  templates: Template[];
  loading?: boolean;
  current?: Template;
  onCreate?: () => void;
  onDelete?: (template: Template) => void;
  onClick?: (template: Template) => void;
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
          <IconButton size="small" color="primary" onClick={onCreate}>
            <Add fontSize="small" />
          </IconButton>
        )}
      </Box>

      <List disablePadding>
        {templates.map((template) => (
          <ListItem
            key={template._id}
            disablePadding
            className={css`
              > .MuiListItemButton-root {
                padding-right: 16px;
              }

              > .MuiListItemSecondaryAction-root {
                display: none;
                right: 8px;
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
              onDelete && (
                <IconButton size="small" onClick={() => onDelete(template)}>
                  <DeleteForever fontSize="small" />
                </IconButton>
              )
            }>
            <ListItemButton selected={current?._id === template._id} onClick={() => onClick?.(template)}>
              <ListItemText
                primary={template.name || template._id}
                primaryTypographyProps={{ noWrap: true }}
                secondary={template.description || template.template}
                secondaryTypographyProps={{
                  sx: { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' },
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}

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

export function useTemplates() {
  const [state, setState] = useState<{ templates: Template[]; loading: boolean; submiting: boolean; error?: Error }>({
    templates: [],
    loading: true,
    submiting: false,
  });

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
    refetch();
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
