import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import PromptEditor, { ComponentPickerOption, INSERT_VARIABLE_COMMAND } from '@blocklet/prompt-editor';
import { cx } from '@emotion/css';
import { ArrowDropDownRounded, TipsAndUpdatesRounded } from '@mui/icons-material';
import {
  Box,
  Button,
  FormLabel,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  buttonClasses,
  inputBaseClasses,
  styled,
} from '@mui/material';
import { useThrottleFn } from 'ahooks';
import { ReactNode, useMemo, useRef } from 'react';
import { ConnectDragPreview, ConnectDragSource, ConnectDropTarget } from 'react-dnd';

import { TemplateYjs } from '../../../api/src/store/projects';
import { CallPromptMessage } from '../../../api/src/store/templates';
import Add from '../../pages/project/icons/add';
import DragVertical from '../../pages/project/icons/drag-vertical';
import Eye from '../../pages/project/icons/eye';
import EyeNo from '../../pages/project/icons/eye-no';
import Trash from '../../pages/project/icons/trash';
import {
  parseDirectivesOfMessages,
  randomId,
  useParameterState,
  usePromptState,
  usePromptsState,
} from '../../pages/project/prompt-state';
import { useTemplateCompare } from '../../pages/project/state';
import { createFile, isCallPromptMessage, isPromptMessage, isTemplate, useStore } from '../../pages/project/yjs-state';
import AwarenessIndicator from '../awareness/awareness-indicator';
import { DragSortListYjs } from '../drag-sort-list';
import TemplateAutocomplete from './template-autocomplete';

export default function Prompts({
  readOnly,
  projectId,
  gitRef,
  value: form,
  compareValue,
}: {
  readOnly?: boolean;
  projectId: string;
  gitRef: string;
  value: TemplateYjs;
  compareValue?: TemplateYjs;
}) {
  const { t } = useLocaleContext();

  const { addPrompt } = usePromptsState({ projectId, gitRef, templateId: form.id });
  const { getDiffBackground } = useTemplateCompare({ value: form as TemplateYjs, compareValue, disabled: readOnly });

  return (
    <Box>
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

        {form.prompts && (
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
              const children = isPromptMessage(prompt) ? (
                <PromptItemView
                  projectId={projectId}
                  gitRef={gitRef}
                  templateId={form.id}
                  promptId={prompt.id}
                  readOnly={readOnly}
                />
              ) : isCallPromptMessage(prompt) ? (
                <CallPromptItemView
                  projectId={projectId}
                  gitRef={gitRef}
                  template={form}
                  promptId={prompt.id}
                  readOnly={readOnly}
                />
              ) : null;

              return (
                children && (
                  <PromptItemContainer
                    disableToggleVisible={!isPromptMessage(prompt)}
                    projectId={projectId}
                    gitRef={gitRef}
                    templateId={form.id}
                    promptId={prompt.id}
                    preview={params.preview}
                    drop={params.drop}
                    drag={params.drag}
                    readOnly={readOnly}
                    isDragging={params.isDragging}
                    style={{
                      '.editor-shell': {
                        ...getDiffBackground('prompts', prompt.id),
                      },
                    }}>
                    {children}
                  </PromptItemContainer>
                )
              );
            }}
          />
        )}
      </Box>

      {!readOnly && (
        <Stack direction="row" gap={2} sx={{ mt: 1, mx: 1 }}>
          <Button startIcon={<Add />} onClick={() => addPrompt({ id: randomId(), content: '', role: 'user' })}>
            {t('add', { object: t('prompt') })}
          </Button>
        </Stack>
      )}
    </Box>
  );
}

function PromptItemContainer({
  projectId,
  gitRef,
  templateId,
  promptId,
  drop,
  preview,
  drag,
  readOnly,
  isDragging,
  children,
  disableToggleVisible,
  style,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
  promptId: string;
  drop: ConnectDropTarget;
  preview: ConnectDragPreview;
  drag: ConnectDragSource;
  readOnly?: boolean;
  isDragging?: boolean;
  children?: ReactNode;
  disableToggleVisible?: boolean;
  style: object;
}) {
  const { t } = useLocaleContext();

  const { prompt, deletePrompt } = usePromptState({ projectId, gitRef, templateId, promptId });
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
        ...(style || {}),
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
          {children}
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
                bgcolor: (theme) => alpha(theme.palette.grey[300], 0.9),
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

              {!disableToggleVisible && (
                <Tooltip
                  title={hidden ? t('activeMessageTip') : t('hideMessageTip')}
                  disableInteractive
                  placement="top">
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
              )}

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

function PromptItemView({
  projectId,
  gitRef,
  templateId,
  promptId,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  templateId: string;
  promptId: string;
  readOnly?: boolean;
}) {
  const { state, prompt, setEditorState } = usePromptState({ projectId, gitRef, templateId, promptId });
  const { addPrompt } = usePromptsState({ projectId, gitRef, templateId });

  const options = useMemo(
    () => [
      new ComponentPickerOption('Execute Prompt', {
        keywords: ['execute', 'prompt'],
        onSelect: (editor) => {
          const variable = `var-${randomId(5)}`;
          const id = randomId();
          addPrompt({ id, role: 'call-prompt', output: variable }, prompt?.index || 0);
          editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
        },
      }),
    ],
    [addPrompt, prompt?.index]
  );

  if (!prompt || !state.editorState) return null;

  return (
    <StyledPromptEditor
      useRoleNode
      p={1}
      editable={!readOnly}
      value={state.editorState}
      onChange={setEditorState}
      componentPickerProps={{ options }}
    />
  );
}

function CallPromptItemView({
  projectId,
  gitRef,
  template,
  promptId,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  promptId: string;
  readOnly?: boolean;
}) {
  const originalOutput = useRef<string>();
  const { renameVariable } = usePromptsState({ projectId, gitRef, templateId: template.id });

  const { t } = useLocaleContext();

  const { prompt } = usePromptState({ projectId, gitRef, templateId: template.id, promptId });
  const { store, getTemplateById } = useStore(projectId, gitRef);

  const rename = useThrottleFn(
    () => {
      if (callPromptMessage?.output && originalOutput.current && originalOutput.current !== callPromptMessage.output) {
        renameVariable({
          [originalOutput.current]: callPromptMessage.output,
        });
        originalOutput.current = callPromptMessage.output;
      }
    },
    { wait: 500, trailing: true }
  );

  if (!prompt) return null;
  const callPromptMessage = isCallPromptMessage(prompt.data) ? prompt.data : null;
  if (!callPromptMessage) return null;

  const templates = Object.values(store.files)
    .filter(isTemplate)
    .filter((i) => i.id !== template.id);

  const targetId = callPromptMessage.template?.id;
  const target = targetId ? getTemplateById(targetId) : undefined;

  const params = target ? parseDirectivesOfMessages(target) : [];

  return (
    <Stack p={1} gap={1}>
      <Stack px={1} direction="row" alignItems="center" gap={1}>
        <Typography noWrap flexShrink={0} variant="body2" fontWeight="fontWeightBold">
          Execute Prompt
        </Typography>

        <TemplateAutocomplete
          fullWidth
          freeSolo
          value={target}
          onChange={(_, value) => {
            if (value && typeof value === 'object') {
              callPromptMessage.template = { id: value.id, name: value.name };
              if (
                value.name &&
                callPromptMessage.output.startsWith(randomVariableNamePrefix) &&
                !parseDirectivesOfMessages(template).some((i) => i.type === 'variable' && i.name === value.name)
              ) {
                originalOutput.current = callPromptMessage.output;
                callPromptMessage.output = value.name;
                rename.run();
              }
            }
          }}
          popupIcon={<ArrowDropDownRounded />}
          forcePopupIcon
          disableClearable
          renderInput={(params) => (
            <TextField {...params} placeholder={t('selectObject', { object: t('template') })} hiddenLabel />
          )}
          options={templates}
          createTemplate={async (data) => createFile({ store, meta: data }).template}
        />

        <TextField
          onFocus={() => (originalOutput.current = callPromptMessage.output)}
          onBlur={rename.run}
          hiddenLabel
          placeholder={t('output')}
          value={callPromptMessage.output || ''}
          onChange={(e) => {
            callPromptMessage.output = e.target.value.trim();
            rename.run();
          }}
          sx={{ [`.${inputBaseClasses.input}`]: { color: 'rgb(234, 179, 8)', fontWeight: 'bold' } }}
        />
      </Stack>

      {params.length > 0 && (
        <Stack px={1} ml={1} gap={1}>
          <Typography variant="caption">{t('parameters')}</Typography>

          {params.map((param) => (
            <Stack key={param.name} direction="row" gap={1}>
              <FormLabel sx={{ minWidth: 100 }}>{param.name}</FormLabel>
              <Box flex={1}>
                <ParameterItem
                  projectId={projectId}
                  gitRef={gitRef}
                  templateId={template.id}
                  prompt={callPromptMessage}
                  index={prompt.index}
                  param={param.name}
                  readOnly={readOnly}
                />
              </Box>
            </Stack>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

const randomVariableNamePrefix = 'var-';

function ParameterItem({
  index,
  projectId,
  gitRef,
  templateId,
  prompt,
  param,
  readOnly,
}: {
  index: number;
  projectId: string;
  gitRef: string;
  templateId: string;
  prompt: CallPromptMessage;
  param: string;
  readOnly?: boolean;
}) {
  const { state, setEditorState } = useParameterState({ projectId, gitRef, templateId, prompt, param });

  const { addPrompt } = usePromptsState({ projectId, gitRef, templateId });

  const options = useMemo(
    () => [
      new ComponentPickerOption('Execute Prompt', {
        keywords: ['execute', 'prompt'],
        onSelect: (editor) => {
          const variable = `${randomVariableNamePrefix}${randomId(5)}`;
          const id = randomId();
          addPrompt({ id, role: 'call-prompt', output: variable }, index || 0);
          editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: variable });
        },
      }),
    ],
    [addPrompt]
  );

  return (
    <StyledPromptEditor
      editable={!readOnly}
      value={state.editorState}
      onChange={setEditorState}
      componentPickerProps={{ options }}
      sx={{
        '.ContentEditable__root': {
          px: 1,
          py: 0.5,
          minHeight: 32,
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: 'rgba(0,0,0,0.03)',
        },
      }}
    />
  );
}

const StyledPromptEditor = styled(PromptEditor)(({ theme }) =>
  theme.unstable_sx({
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
  })
);
