import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import PromptEditor from '@blocklet/prompt-editor';
import { cx } from '@emotion/css';
import { useMonaco } from '@monaco-editor/react';
import { ArrowDropDownRounded, TipsAndUpdatesRounded } from '@mui/icons-material';
import {
  Autocomplete,
  Box,
  Button,
  FormLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  buttonClasses,
  inputBaseClasses,
  selectClasses,
  styled,
} from '@mui/material';
import { useThrottleFn } from 'ahooks';
import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { ConnectDragPreview, ConnectDragSource, ConnectDropTarget } from 'react-dnd';
import { useAsync } from 'react-use';

import { TemplateYjs } from '../../../api/src/store/projects';
import {
  CallDatasetMessage,
  CallFuncMessage,
  CallPromptMessage,
  EditorPromptMessage,
} from '../../../api/src/store/templates';
import { getDatasets } from '../../libs/dataset';
import Add from '../../pages/project/icons/add';
import DragVertical from '../../pages/project/icons/drag-vertical';
import Eye from '../../pages/project/icons/eye';
import EyeNo from '../../pages/project/icons/eye-no';
import Trash from '../../pages/project/icons/trash';
import {
  parseDirectivesOfTemplate,
  randomId,
  useEditorPicker,
  useParameterState,
  useParametersState,
  usePromptState,
  usePromptsState,
} from '../../pages/project/prompt-state';
import { useTemplateCompare } from '../../pages/project/state';
import {
  createFile,
  isCallAPIMessage,
  isCallDatasetMessage,
  isCallFuncMessage,
  isCallPromptMessage,
  isPromptMessage,
  isTemplate,
  useStore,
} from '../../pages/project/yjs-state';
import AwarenessIndicator from '../awareness/awareness-indicator';
import { DragSortListYjs } from '../drag-sort-list';
import CodeEditor from './code-editer';
import TemplateAutocomplete from './template-autocomplete';

const CONST_TYPE = {
  prompt: 'prompt',
  callPrompt: 'callPrompt',
  callAPI: 'callAPI',
  callFunc: 'callFunc',
  callDataset: 'callDataset',
};

const componentMap = {
  [CONST_TYPE.prompt]: PromptItemView,
  [CONST_TYPE.callPrompt]: CallPromptItemView,
  [CONST_TYPE.callAPI]: CallAPIItemView,
  [CONST_TYPE.callFunc]: CallFuncItemView,
  [CONST_TYPE.callDataset]: CallDatasetItemView,
};

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
  const { getDiffBackground } = useTemplateCompare({ value: form as TemplateYjs, compareValue, readOnly });

  const getChildren = useCallback(
    (prompt: EditorPromptMessage) => {
      const getType = () => {
        if (isPromptMessage(prompt)) {
          return CONST_TYPE.prompt;
        }

        if (isCallPromptMessage(prompt)) {
          return CONST_TYPE.callPrompt;
        }

        if (isCallAPIMessage(prompt)) {
          return CONST_TYPE.callAPI;
        }

        if (isCallFuncMessage(prompt)) {
          return CONST_TYPE.callFunc;
        }

        if (isCallDatasetMessage(prompt)) {
          return CONST_TYPE.callDataset;
        }

        return null;
      };

      const type = getType();
      const Component = type ? componentMap[type] : '';
      const children = Component ? (
        <Component projectId={projectId} gitRef={gitRef} template={form} promptId={prompt.id} readOnly={readOnly} />
      ) : null;

      return children;
    },
    [projectId, gitRef, form, readOnly]
  );
  const { updateParametersIfNeeded } = useParametersState(form);

  useEffect(() => {
    updateParametersIfNeeded();
  }, [updateParametersIfNeeded]);

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
              const children = getChildren(prompt);

              return (
                children && (
                  <PromptItemContainer
                    disableToggleVisible={!isPromptMessage(prompt)}
                    projectId={projectId}
                    gitRef={gitRef}
                    template={form}
                    promptId={prompt.id}
                    preview={params.preview}
                    drop={params.drop}
                    drag={params.drag}
                    readOnly={readOnly}
                    isDragging={params.isDragging}
                    style={{
                      '.editor-container': {
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
  promptId,
  drop,
  preview,
  drag,
  readOnly,
  isDragging,
  children,
  disableToggleVisible,
  style,
  template,
}: {
  projectId: string;
  gitRef: string;
  promptId: string;
  drop: ConnectDropTarget;
  preview: ConnectDragPreview;
  drag: ConnectDragSource;
  readOnly?: boolean;
  isDragging?: boolean;
  children?: ReactNode;
  disableToggleVisible?: boolean;
  style: object;
  template: TemplateYjs;
}) {
  const { t } = useLocaleContext();

  const templateId = template.id;
  const { prompt, deletePrompt } = usePromptState({
    projectId,
    gitRef,
    templateId,
    promptId,
    readOnly,
    originTemplate: template,
  });
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
          className={cx(hidden && 'prompt-hidden', 'editor-container')}
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
  template,
  promptId,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  promptId: string;
  readOnly?: boolean;
  template: TemplateYjs;
}) {
  const templateId = template.id;
  const { state, prompt, setEditorState } = usePromptState({
    projectId,
    gitRef,
    templateId,
    promptId,
    readOnly,
    originTemplate: template,
  });
  const { getOptions } = useEditorPicker({ projectId, gitRef, templateId });
  const options = getOptions(prompt?.index);

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

  const { prompt } = usePromptState({
    projectId,
    gitRef,
    templateId: template.id,
    promptId,
    readOnly,
    originTemplate: template,
  });
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

  const params = target ? parseDirectivesOfTemplate(target, { excludeNonPromptVariables: true }) : [];

  return (
    <Stack p={1} gap={1}>
      <Stack px={1} direction="row" alignItems="center" gap={1}>
        <Typography noWrap flexShrink={0} variant="body2" fontWeight="fontWeightBold">
          {t('call.list.prompt')}
        </Typography>

        <TemplateAutocomplete
          sx={{ flex: 1 }}
          fullWidth
          freeSolo
          value={target}
          onChange={(_, value) => {
            if (value && typeof value === 'object') {
              callPromptMessage.template = { id: value.id, name: value.name };
              if (value.name) {
                originalOutput.current = callPromptMessage.output;

                const existsVariables = new Set(
                  parseDirectivesOfTemplate(template)
                    .filter((i) => i.type === 'variable')
                    .map((i) => i.name)
                );

                let newName = value.name;
                let index = 0;

                while (existsVariables.has(newName)) {
                  newName = `${value.name} ${++index}`;
                }

                callPromptMessage.output = newName;

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
          sx={{ width: 100, [`.${inputBaseClasses.input}`]: { color: 'rgb(234, 179, 8)', fontWeight: 'bold' } }}
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

function CallAPIItemView({
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

  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  const { prompt } = usePromptState({
    projectId,
    gitRef,
    templateId: template.id,
    promptId,
    readOnly,
    originTemplate: template,
  });

  const rename = useThrottleFn(
    () => {
      if (callAPIMessage?.output && originalOutput.current && originalOutput.current !== callAPIMessage.output) {
        renameVariable({
          [originalOutput.current]: callAPIMessage.output,
        });
        originalOutput.current = callAPIMessage.output;
      }
    },
    { wait: 500, trailing: true }
  );

  if (!prompt) return null;
  const callAPIMessage = isCallAPIMessage(prompt.data) ? prompt.data : null;
  if (!callAPIMessage) return null;

  return (
    <Stack p={1} gap={1}>
      <Stack
        px={1}
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ [`.${inputBaseClasses.input}`]: { color: 'rgb(234, 179, 8)', fontWeight: 'bold' } }}>
        <Typography noWrap flexShrink={0} variant="body2" fontWeight="fontWeightBold">
          {t('call.list.api')}
        </Typography>

        <Stack flex={1} direction="row" alignItems="center" gap={1}>
          <Select
            sx={{
              width: 80,
              [`.${selectClasses.select}`]: {
                fontSize: 12,
                px: 1,
                pr: '18px !important',
              },
              [`.${selectClasses.icon}`]: {
                fontSize: 16,
                right: 2,
              },
            }}
            value={callAPIMessage.method ?? ''}
            onChange={(e) => (callAPIMessage.method = e.target.value)}>
            {methods.map((method) => {
              return (
                <MenuItem value={method.toLocaleLowerCase()} key={method.toLocaleLowerCase()}>
                  {method.toLocaleUpperCase()}
                </MenuItem>
              );
            })}
          </Select>

          <TextField
            sx={{ flex: 1 }}
            hiddenLabel
            placeholder={t('call.api.placeholder')}
            value={callAPIMessage.url ?? ''}
            onChange={(e) => (callAPIMessage.url = e.target.value)}
          />
        </Stack>

        <TextField
          onFocus={() => (originalOutput.current = callAPIMessage.output)}
          onBlur={rename.run}
          hiddenLabel
          placeholder={t('output')}
          value={callAPIMessage.output || ''}
          onChange={(e) => {
            callAPIMessage.output = e.target.value.trim();
            rename.run();
          }}
          sx={{ width: 100 }}
        />
      </Stack>

      {['post', 'put', 'patch', 'delete'].includes(callAPIMessage.method) && (
        <Stack px={1} ml={1} gap={1}>
          <Typography variant="caption">{t('call.api.body')}</Typography>

          <CodeEditor
            readOnly={readOnly}
            defaultLanguage="json"
            language="json"
            value={callAPIMessage.body}
            onChange={(value) => {
              callAPIMessage.body = value;
            }}
          />
        </Stack>
      )}
    </Stack>
  );
}

function CallFuncItemView({
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
  const { getTemplateById } = useStore(projectId, gitRef);
  const currentTemplate = getTemplateById(template.id);

  const monaco = useMonaco();

  const { t } = useLocaleContext();

  const { prompt } = usePromptState({
    projectId,
    gitRef,
    templateId: template.id,
    promptId,
    readOnly,
    originTemplate: template,
  });

  const rename = useThrottleFn(
    () => {
      if (callFuncMessage?.output && originalOutput.current && originalOutput.current !== callFuncMessage.output) {
        renameVariable({
          [originalOutput.current]: callFuncMessage.output,
        });
        originalOutput.current = callFuncMessage.output;
      }
    },
    { wait: 500, trailing: true }
  );

  const temp = currentTemplate && JSON.parse(JSON.stringify(currentTemplate));

  useEffect(() => {
    if (monaco && currentTemplate) {
      const params = new Set<string>();
      parseDirectivesOfTemplate(currentTemplate).forEach((directive) => {
        if (directive.type === 'variable' && typeof directive.name === 'string') {
          params.add(directive.name);
        }
      });

      Object.values(template.prompts ?? {}).forEach(({ data }) => {
        if (!isCallPromptMessage(data) && 'output' in data && data.output) {
          params.add(data.output);
        }
      });

      const output = (prompt?.data as CallFuncMessage)?.output;
      if (typeof output === 'string') {
        params.delete(output);
      }

      const customTypeDefinitions = `
        declare var context: {
          get: (name: (${[...params].map((x) => `'${x}'`).join('|')})) => any;
        };
      `;

      monaco?.languages?.typescript?.typescriptDefaults?.addExtraLib?.(customTypeDefinitions, 'custom.d.ts');
      monaco?.languages?.typescript?.javascriptDefaults?.addExtraLib?.(customTypeDefinitions, 'custom.d.ts');
    }
  }, [monaco, temp, prompt]);

  if (!prompt) return null;
  const callFuncMessage = isCallFuncMessage(prompt.data) ? prompt.data : null;
  if (!callFuncMessage) return null;

  return (
    <Stack p={1} gap={1}>
      <Stack
        px={1}
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ [`.${inputBaseClasses.input}`]: { color: 'rgb(234, 179, 8)', fontWeight: 'bold' } }}>
        <Typography noWrap flexShrink={0} variant="body2" fontWeight="fontWeightBold">
          {t('call.list.func')}
        </Typography>

        <Stack flex={1} direction="row" alignItems="center" gap={1} />

        <TextField
          onFocus={() => (originalOutput.current = callFuncMessage.output)}
          onBlur={rename.run}
          hiddenLabel
          placeholder={t('output')}
          value={callFuncMessage.output || ''}
          onChange={(e) => {
            callFuncMessage.output = e.target.value.trim();
            rename.run();
          }}
          sx={{ width: 100 }}
        />
      </Stack>

      <Stack px={1} ml={1} gap={1}>
        <Typography variant="caption">{t('call.func.code')}</Typography>

        <CodeEditor
          readOnly={Boolean(readOnly)}
          defaultLanguage="javascript"
          language="javascript"
          value={callFuncMessage.code || ''}
          onChange={(value) => {
            callFuncMessage.code = value || '';
          }}
        />
      </Stack>
    </Stack>
  );
}

function CallDatasetItemView({
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
  const { t } = useLocaleContext();

  const originalOutput = useRef<string>();
  const { renameVariable } = usePromptsState({ projectId, gitRef, templateId: template.id });
  const { value: datasetsRes } = useAsync(() => getDatasets(), []);
  const datasets = useMemo(() => datasetsRes?.datasets.map((i) => ({ id: i._id!, name: i.name })) ?? [], [datasetsRes]);

  const { prompt } = usePromptState({
    projectId,
    gitRef,
    templateId: template.id,
    promptId,
    readOnly,
    originTemplate: template,
  });

  const rename = useThrottleFn(
    () => {
      if (
        callDatasetMessage?.output &&
        originalOutput.current &&
        originalOutput.current !== callDatasetMessage.output
      ) {
        renameVariable({
          [originalOutput.current]: callDatasetMessage.output,
        });
        originalOutput.current = callDatasetMessage.output;
      }
    },
    { wait: 500, trailing: true }
  );

  if (!prompt) return null;
  const callDatasetMessage = isCallDatasetMessage(prompt.data) ? prompt.data : null;
  if (!callDatasetMessage) return null;

  return (
    <Stack p={1} gap={1}>
      <Stack
        px={1}
        direction="row"
        alignItems="center"
        gap={1}
        sx={{ [`.${inputBaseClasses.input}`]: { color: 'rgb(234, 179, 8)', fontWeight: 'bold' } }}>
        <Typography noWrap flexShrink={0} variant="body2" fontWeight="fontWeightBold">
          {t('call.list.dataset')}
        </Typography>

        <Stack flex={1} direction="row" alignItems="center" gap={1}>
          <Autocomplete
            readOnly={readOnly}
            fullWidth
            size="small"
            value={callDatasetMessage.vectorStore ?? null}
            onChange={(_, value) => (callDatasetMessage.vectorStore = value ?? undefined)}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder={t('form.dataset')}
                hiddenLabel
                sx={{
                  [`> .${inputBaseClasses.root}`]: {
                    py: '4px !important',
                  },
                }}
              />
            )}
            options={datasets}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            getOptionLabel={(v) => v.name || 'Unnamed'}
          />
        </Stack>

        <TextField
          onFocus={() => (originalOutput.current = callDatasetMessage.output)}
          onBlur={rename.run}
          hiddenLabel
          placeholder={t('output')}
          value={callDatasetMessage.output || ''}
          onChange={(e) => {
            callDatasetMessage.output = e.target.value.trim();
            rename.run();
          }}
          sx={{ width: 100 }}
        />
      </Stack>

      <Stack px={1} ml={1} gap={1}>
        <Stack direction="row" gap={1}>
          <FormLabel sx={{ minWidth: 60, lineHeight: '32px' }}>{t('call.dataset.search')}</FormLabel>

          <Box flex={1}>
            <ParameterItem
              projectId={projectId}
              gitRef={gitRef}
              templateId={template.id}
              prompt={callDatasetMessage}
              index={prompt.index}
              param="query"
              readOnly={readOnly}
            />
          </Box>
        </Stack>
      </Stack>
    </Stack>
  );
}

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
  prompt: CallPromptMessage | CallDatasetMessage;
  param: string;
  readOnly?: boolean;
}) {
  const { state, setEditorState } = useParameterState({ projectId, gitRef, templateId, prompt, param });

  const { getOptions } = useEditorPicker({ projectId, gitRef, templateId });

  const options = getOptions(index);

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
