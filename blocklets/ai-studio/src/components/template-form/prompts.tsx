import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import PromptEditor from '@blocklet/prompt-editor';
import { cx } from '@emotion/css';
import { TipsAndUpdatesRounded } from '@mui/icons-material';
import { Box, Button, Stack, Tooltip, Typography, alpha, buttonClasses } from '@mui/material';
import { nanoid } from 'nanoid';
import { ConnectDragPreview, ConnectDragSource, ConnectDropTarget } from 'react-dnd';

import { TemplateYjs } from '../../../api/src/store/projects';
import Add from '../../pages/project/icons/add';
import DragVertical from '../../pages/project/icons/drag-vertical';
import Eye from '../../pages/project/icons/eye';
import EyeNo from '../../pages/project/icons/eye-no';
import Trash from '../../pages/project/icons/trash';
import { usePromptState } from '../../pages/project/prompt-state';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import { DragSortListYjs } from '../drag-sort-list';

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

            <Typography variant="subtitle1">{t('prompts')}</Typography>
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
            renderItem={(prompt, _, params) => {
              return (
                <PromptItemView
                  projectId={projectId}
                  gitRef={gitRef}
                  templateId={form.id}
                  promptId={prompt.id}
                  preview={params.preview}
                  drop={params.drop}
                  drag={params.drag}
                  readOnly={readOnly}
                  isDragging={params.isDragging}
                />
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

function PromptItemView({
  projectId,
  gitRef,
  templateId,
  promptId,
  drag,
  preview,
  drop,
  readOnly,
  isDragging,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
  promptId: string;
  drag: ConnectDragSource;
  preview: ConnectDragPreview;
  drop: ConnectDropTarget;
  readOnly?: boolean;
  isDragging?: boolean;
}) {
  const { t } = useLocaleContext();
  const { state, prompt, deletePrompt, setEditorState } = usePromptState({ projectId, gitRef, templateId, promptId });

  if (!prompt) return null;

  const hidden = prompt.data.visibility === 'hidden';

  return (
    <Box
      ref={drop}
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
          ref={preview}
          className={cx(hidden && 'prompt-hidden')}
          sx={{
            flex: 1,
            borderRadius: 1,
            bgcolor: isDragging ? 'action.hover' : 'background.paper',
            opacity: 0.9999, // NOTE: make preview effective

            '&.prompt-hidden *': {
              color: (theme) => `${theme.palette.text.disabled} !important`,
            },
          }}>
          <WithAwareness projectId={projectId} gitRef={gitRef} path={[templateId, 'prompts', prompt.index]}>
            <PromptEditor
              p={1}
              editable={!readOnly}
              value={state.editorState}
              onChange={setEditorState}
              // content={prompt.content}
              // role={prompt.role}
              // onChange={(content, role) => {
              //   doc.transact(() => {
              //     prompt.content = content;
              //     prompt.role = role;
              //   });
              //   triggerUpdate();
              // }}
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
                <Button onClick={() => deletePrompt(promptId)}>
                  <Trash sx={{ fontSize: '1.25rem', color: 'grey.500' }} />
                </Button>
              </Tooltip>

              <Tooltip title={hidden ? t('activeMessageTip') : t('hideMessageTip')} disableInteractive placement="top">
                <Button
                  sx={{
                    color: 'grey.500',
                    bgcolor: hidden ? 'action.selected' : undefined,
                  }}
                  onClick={() => (prompt.data.visibility = hidden ? undefined : 'hidden')}>
                  {prompt.data.visibility === 'hidden' ? (
                    <EyeNo sx={{ fontSize: '1.25rem' }} />
                  ) : (
                    <Eye sx={{ fontSize: '1.25rem' }} />
                  )}
                </Button>
              </Tooltip>

              <Tooltip title={t('dragMessageTip')} disableInteractive placement="top">
                <Button ref={drag}>
                  <DragVertical sx={{ color: 'grey.500' }} />
                </Button>
              </Tooltip>
            </Stack>
          </Box>
        )}

        <AwarenessIndicator
          projectId={projectId}
          gitRef={gitRef}
          path={[templateId, 'prompts', prompt.index]}
          sx={{ position: 'absolute', left: '100%', top: 0 }}
        />
      </Stack>
    </Box>
  );
}
