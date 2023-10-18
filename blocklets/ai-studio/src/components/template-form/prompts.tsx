import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Button, Input, MenuItem, Select, SelectProps, Stack, inputClasses, selectClasses } from '@mui/material';
import { useCounter } from 'ahooks';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import { useDeferredValue, useEffect, useRef } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import { ParameterYjs, Role } from '../../../api/src/store/templates';
import Add from '../../pages/project/icons/add';
import DragVertical from '../../pages/project/icons/drag-vertical';
import Trash from '../../pages/project/icons/trash';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import { DragSortListYjs } from '../drag-sort-list';
import { matchParams } from './parameters';

export default function Prompts({
  readOnly,
  projectId,
  gitRef,
  value: form,
}: {
  readOnly?: boolean;
  projectId: string;
  gitRef: string;
  value: TemplateYjs;
}) {
  const { t } = useLocaleContext();

  const parametersHistory = useRef<Record<string, ParameterYjs>>({});

  // NOTE: 用来触发 parameters 更新
  const [updateTrigger, { inc: triggerUpdate }] = useCounter();
  const deferredTrigger = useDeferredValue(updateTrigger);

  useEffect(() => {
    const vars = Object.values(form.prompts ?? {})?.flatMap((i) => matchParams(i.data.content ?? '')) ?? [];
    if (form.type === 'branch') {
      vars.push('question');
    }
    if (form.type === 'image') {
      vars.push('size');
      vars.push('number');
    }
    const params = [...new Set(vars)];

    if (!form.parameters && params.length === 0) {
      return;
    }

    const doc = (getYjsValue(form) as Map<any>).doc!;
    doc.transact(() => {
      form.parameters ??= {};
      for (const param of params) {
        const history = parametersHistory.current[param];
        form.parameters[param] ??= history ?? {};
      }
      for (const [key, val] of Object.entries(form.parameters)) {
        if (form.type === 'branch' && key === 'question') {
          continue;
        }
        if (form.type === 'image' && ['size', 'number'].includes(key)) {
          continue;
        }
        if (!params.includes(key)) {
          delete form.parameters[key];
          parametersHistory.current[key] = JSON.parse(JSON.stringify(val));
        }
      }
    });
  }, [deferredTrigger]);

  return (
    <Box>
      {form.prompts && Object.keys(form.prompts).length > 0 && (
        <Box sx={{ border: (theme) => `1px solid ${theme.palette.grey[200]}`, borderRadius: 1 }}>
          <DragSortListYjs
            disabled={readOnly}
            list={form.prompts}
            renderItem={(prompt, index, params) => (
              <Box
                ref={params.drop}
                sx={{
                  bgcolor: params.isDragging ? 'grey.100' : undefined,
                  '&:not(:last-of-type)': {
                    borderBottom: (theme) => `1px solid ${theme.palette.grey[200]}`,
                  },
                }}>
                <Stack direction="row" sx={{ position: 'relative' }}>
                  <Stack sx={{ position: 'absolute', zIndex: 1, top: 4, left: 4 }}>
                    <RoleSelector
                      readOnly={readOnly}
                      value={prompt.role ?? 'system'}
                      onChange={(e) => (prompt.role = e.target.value as any)}
                    />
                  </Stack>

                  <WithAwareness projectId={projectId} gitRef={gitRef} path={[form.id, 'prompts', index]}>
                    <Input
                      readOnly={readOnly}
                      ref={params.preview}
                      fullWidth
                      multiline
                      minRows={2}
                      value={prompt.content ?? ''}
                      onChange={(e) => {
                        prompt.content = e.target.value;
                        triggerUpdate();
                      }}
                      sx={{
                        bgcolor: 'background.paper',
                        borderRadius: 1,
                        [`.${inputClasses.input}`]: { px: 1, textIndent: indentWidth(prompt.role) },
                      }}
                    />
                  </WithAwareness>

                  {!readOnly && (
                    <Stack sx={{ p: 0.5 }}>
                      <Button
                        sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}
                        onClick={() => {
                          const doc = (getYjsValue(form.prompts) as Map<any>).doc!;
                          doc.transact(() => {
                            if (form.prompts) {
                              delete form.prompts[prompt.id];
                              sortBy(Object.values(form.prompts), (i) => i.index).forEach(
                                (i, index) => (i.index = index)
                              );
                            }
                          });
                          triggerUpdate();
                        }}>
                        <Trash sx={{ fontSize: 20, color: 'grey.500' }} />
                      </Button>

                      <Button ref={params.drag} sx={{ minWidth: 24, width: 24, height: 24, p: 0 }}>
                        <DragVertical sx={{ color: 'grey.500' }} />
                      </Button>
                    </Stack>
                  )}

                  <AwarenessIndicator
                    projectId={projectId}
                    gitRef={gitRef}
                    path={[form.id, 'prompts', index]}
                    sx={{ position: 'absolute', left: '100%', top: 0 }}
                  />
                </Stack>
              </Box>
            )}
          />
        </Box>
      )}

      {!readOnly && (
        <Button
          sx={{ mt: 1 }}
          size="small"
          startIcon={<Add />}
          onClick={() => {
            const id = nanoid();
            const doc = (getYjsValue(form) as Map<any>).doc!;
            doc.transact(() => {
              form.prompts ??= {};
              form.prompts[id] = {
                index: Object.keys(form.prompts).length,
                data: { id, content: '', role: 'user' },
              };
            });
          }}>
          {t('add', { object: t('prompt') })}
        </Button>
      )}
    </Box>
  );
}

function RoleSelector({ ...props }: SelectProps<Role>) {
  return (
    <Select
      {...props}
      size="small"
      MenuProps={{
        slotProps: { paper: { sx: { mt: 0.5 } } },
      }}
      sx={{
        [`.${selectClasses.select}`]: {
          fontSize: 12,
          px: 1,
          pr: '18px !important',
        },
        [`.${selectClasses.icon}`]: {
          fontSize: 16,
          right: 2,
        },
        ...props.sx,
      }}>
      <MenuItem value="system">System</MenuItem>
      <MenuItem value="user">User</MenuItem>
      <MenuItem value="assistant">Assistant</MenuItem>
    </Select>
  );
}

const indentWidth = (role?: Role) => {
  const map = {
    system: '72px',
    user: '56px',
    assistant: '81px',
  };
  return map[role!] || map.user;
};
