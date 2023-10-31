import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import PromptEditor from '@blocklet/prompt-editor';
import { cx } from '@emotion/css';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Button, Stack, Tooltip, Typography, alpha, buttonClasses } from '@mui/material';
import { useCounter } from 'ahooks';
import sortBy from 'lodash/sortBy';
import { nanoid } from 'nanoid';
import { useDeferredValue, useEffect, useRef } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import { ParameterYjs } from '../../../api/src/store/templates';
import Add from '../../pages/project/icons/add';
import DragVertical from '../../pages/project/icons/drag-vertical';
import Eye from '../../pages/project/icons/eye';
import EyeNo from '../../pages/project/icons/eye-no';
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
        <Box
          sx={{
            border: 2,
            borderColor: 'primary.main',
            borderRadius: 2,
            bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.action.focusOpacity),
          }}>
          <Stack direction="row" alignItems="center" sx={{ px: 2, my: 1, gap: 1 }}>
            <TipsAndUpdatesRounded fontSize="small" color="primary" />

            <Typography variant="subtitle2">{t('prompts')}</Typography>
          </Stack>

          <DragSortListYjs
            disabled={readOnly}
            list={form.prompts}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',

              '&.isDragging': {
                '.hover-visible': {
                  maxHeight: '0 !important',
                },
                '.ContentEditable__root:hover': {
                  bgcolor: 'background.paper',
                },
              },
            }}
            renderItem={(prompt, index, params) => {
              const doc = (getYjsValue(prompt) as Map<any>).doc!;
              const hidden = prompt.visibility === 'hidden';

              return (
                <Box
                  ref={params.drop}
                  sx={{
                    '&:not(:last-of-type)': {
                      borderBottom: 1,
                      borderColor: 'background.default',
                    },
                    ':hover .hover-visible': {
                      maxHeight: '100%',
                    },
                  }}>
                  <Stack direction="row" sx={{ position: 'relative' }}>
                    <Box
                      ref={params.preview}
                      className={cx(hidden && 'prompt-hidden')}
                      sx={{
                        flex: 1,
                        borderRadius: 1,
                        bgcolor: params.isDragging ? 'action.hover' : 'background.paper',
                        opacity: 0.9999, // NOTE: make preview effective

                        '&.prompt-hidden *': {
                          color: (theme) => `${theme.palette.text.disabled} !important`,
                        },
                      }}>
                      <WithAwareness projectId={projectId} gitRef={gitRef} path={[form.id, 'prompts', index]}>
                        <PromptEditor
                          p={1}
                          editable={!readOnly}
                          content={prompt.content}
                          role={prompt.role}
                          onChange={(content, role) => {
                            doc.transact(() => {
                              prompt.content = content;
                              prompt.role = role;
                            });
                            triggerUpdate();
                          }}
                          sx={(theme) => ({
                            p: 0,
                            '.ContentEditable__root': {
                              p: 1,
                              minHeight: 48,
                              ...theme.typography.body1,

                              ':hover': {
                                bgcolor: 'action.hover',
                              },

                              ':focus': {
                                bgcolor: 'action.hover',
                              },

                              '.role-selector': { fontWeight: 'bold' },
                            },
                          })}
                        />
                      </WithAwareness>
                    </Box>

                    {!readOnly && (
                      <Box
                        className="hover-visible"
                        sx={{
                          maxHeight: 0,
                          overflow: 'hidden',
                          position: 'absolute',
                          right: 0,
                          top: 0,
                        }}>
                        <Stack
                          direction="row"
                          sx={{
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            p: 0.5,
                            [`.${buttonClasses.root}`]: {
                              minWidth: 24,
                              width: 24,
                              height: 24,
                              p: 0,
                            },
                          }}>
                          <Tooltip title={t('deleteMessageTip')} disableInteractive placement="top">
                            <Button
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
                              <Trash sx={{ fontSize: '1.25rem', color: 'grey.500' }} />
                            </Button>
                          </Tooltip>

                          <Tooltip
                            title={hidden ? t('activeMessageTip') : t('hideMessageTip')}
                            disableInteractive
                            placement="top">
                            <Button
                              sx={{
                                color: 'grey.500',
                                bgcolor: hidden ? 'action.selected' : undefined,
                              }}
                              onClick={() => (prompt.visibility = hidden ? undefined : 'hidden')}>
                              {prompt.visibility === 'hidden' ? (
                                <EyeNo sx={{ fontSize: '1.25rem' }} />
                              ) : (
                                <Eye sx={{ fontSize: '1.25rem' }} />
                              )}
                            </Button>
                          </Tooltip>

                          <Tooltip title={t('dragMessageTip')} disableInteractive placement="top">
                            <Button ref={params.drag}>
                              <DragVertical sx={{ color: 'grey.500' }} />
                            </Button>
                          </Tooltip>
                        </Stack>
                      </Box>
                    )}

                    <AwarenessIndicator
                      projectId={projectId}
                      gitRef={gitRef}
                      path={[form.id, 'prompts', index]}
                      sx={{ position: 'absolute', left: '100%', top: 0 }}
                    />
                  </Stack>
                </Box>
              );
            }}
          />
        </Box>
      )}

      {!readOnly && (
        <Button
          sx={{ mt: 1, mx: 1 }}
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
