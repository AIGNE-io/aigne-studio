import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs, isImageAssistant, isPromptAssistant } from '@blocklet/ai-runtime/types';
import PromptEditor, { EditorState } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { Box, Button, Paper, Stack } from '@mui/material';
import { useAsyncEffect, useDebounceFn } from 'ahooks';
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react';

import WithAwareness from '../awareness/with-awareness';
import useVariablesEditorOptions from './use-variables-editor-options';

function extractBracketContent(text: string) {
  const pattern = /^\{\{(.*)\}\}$/;
  const match = pattern.exec(text);
  return ((match ? match[1] : '') || '').trim();
}

const variableStyle = `
  color: rgb(234, 179, 8);
  font-weight: bold;
  cursor: pointer;
`;

const textStyle = `
  color: rgb(239, 83, 80);
  font-weight: bold;
  cursor: pointer;
`;

export default function PromptEditorField({
  placeholder,
  projectId,
  gitRef,
  path,
  assistant,
  value,
  onChange,
  readOnly,
  includeOutputVariables,
  role,
  CallAssistantIndex,
  ...props
}: {
  placeholder?: string;
  projectId: string;
  gitRef: string;
  path: (string | number)[];
  assistant?: AssistantYjs;
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  includeOutputVariables?: boolean;
  role?: string;
  CallAssistantIndex?: number;
} & Omit<ComponentProps<typeof PromptEditor>, 'value' | 'onChange'>) {
  const { t } = useLocaleContext();
  const { from, options, variables, addParameter, updateParameter } = useVariablesEditorOptions(assistant, {
    CallAssistantIndex,
    includeOutputVariables,
  });

  const parameterChange = () => {
    if (assistant && (isPromptAssistant(assistant) || isImageAssistant(assistant))) {
      const textNodes = document.querySelectorAll('[data-lexical-variable]');

      // 添加变量
      textNodes.forEach((node) => {
        const currentVariables = Object.values(assistant.parameters ?? {}).filter(
          (p) => p.data.from === from && !p.data.hidden
        );

        const id = node.getAttribute('data-lexical-id');
        const variable = extractBracketContent(node.textContent || '').trim();
        if (!id && variable && !currentVariables.some((v) => v?.data?.key === variable))
          addParameter(variable, { from });
      });
    }
  };

  const { editorState, setEditorState } = usePromptEditorState({
    value: value || '',
    onChange: (value) => {
      onChange(value);
      parameterChange();
    },
    readOnly,
  });

  const getParameters = (text: string) => {
    const parameters = Object.values(assistant?.parameters || []).filter((i) => !i.data.hidden);
    const list = parameters.map((i) => i.data.key);
    const index = list.findIndex((x) => x === text);
    return parameters[index]?.data;
  };

  const getParameterType = (parameter?: Partial<ParameterYjs>): string => {
    if (!parameter) {
      return 'string';
    }

    if (parameter.type === 'string') {
      return parameter?.multiline ? 'multiline' : 'string';
    }

    return parameter?.type || 'string';
  };

  const typeMap: Record<string, string> = useMemo(() => {
    return {
      string: t('text'),
      multiline: t('multiline'),
      image: t('image'),
      number: t('number'),
      select: t('select'),
      language: t('language'),
      boolean: t('boolean'),
      source: t('source'),
      llmInputMessages: t('llmInputMessages'),
      llmInputTools: t('llmInputTools'),
      llmInputToolChoice: t('llmInputToolChoice'),
      llmInputResponseFormat: t('llmInputResponseFormat'),
    };
  }, [t]);

  return (
    <WithAwareness sx={{ top: 0, right: 0 }} projectId={projectId} gitRef={gitRef} path={path}>
      <PromptEditor
        {...props}
        placeholder={placeholder || ''}
        editable={!readOnly}
        variables={variables}
        value={editorState}
        onChange={setEditorState}
        variablePickerProps={{ options }}
        ContentProps={{
          ...props.ContentProps,
          sx: { bgcolor: 'grey.100', p: 1, borderRadius: 1, ...props.ContentProps?.sx },
        }}
        popperElement={({ text, handleClose }) => {
          const variable = (text || '').split('.')[0] || '';

          if (!variable.trim()) return <Box />;

          if ((variables || []).includes(variable)) {
            const parameter = getParameters(variable);
            const type = getParameterType(parameter);

            if (parameter?.type === 'image' && role && role !== 'user') {
              return (
                <Paper>
                  <Box
                    sx={{
                      p: 1,
                      minWidth: '100px',
                      fontSize: (theme) => theme.typography.caption.fontSize,
                      fontWeight: (theme) => theme.palette.text.disabled,
                    }}>
                    {t('imageParameterInNotUserRole')}
                  </Box>
                </Paper>
              );
            }

            return (
              <Paper>
                <Stack
                  gap={0.5}
                  sx={{
                    p: 1,
                    minWidth: '100px',
                    fontSize: (theme) => theme.typography.caption.fontSize,
                    fontWeight: (theme) => theme.palette.text.disabled,
                  }}>
                  <Box>{`${t('format')}: ${typeMap[type]}`}</Box>
                  <Box>{`${t('label')}: ${parameter?.label || variable}`}</Box>
                  {!!parameter?.placeholder && <Box>{`${t('placeholder')}: ${parameter?.placeholder || ''}`}</Box>}
                  {!!parameter?.defaultValue && <Box>{`${t('defaultValue')}: ${parameter?.defaultValue || ''}`}</Box>}
                </Stack>
              </Paper>
            );
          }

          return (
            <Paper sx={{ p: 1 }}>
              <Stack gap={1}>
                <Box
                  sx={{
                    p: 1,
                    fontSize: (theme) => theme.typography.body1.fontSize,
                    fontWeight: (theme) => theme.typography.fontWeightBold,
                    // color: (theme) => theme.palette.error.light,
                  }}>
                  {t('nonExistentVariable', { data: variable })}
                </Box>

                <Stack direction="row" gap={1} justifyContent="flex-end">
                  <Button
                    sx={{ p: 0 }}
                    onClick={() => {
                      addParameter(variable, { from });
                      handleClose();
                    }}
                    size="small">
                    {t('addVariable')}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          );
        }}
        onChangeVariableNode={({ editor, element, node, action }) => {
          const text = extractBracketContent(element.textContent || '');
          const variable = (text || '').split('.')[0] || '';
          const id = element.getAttribute('data-lexical-id');
          const parameters = assistant?.parameters || {};

          if (action === 'inputChange') {
            if (id) {
              const parameter = parameters[id];
              if (parameter && parameter?.data.key !== variable) {
                setTimeout(() => updateParameter(id, text), 0);
              }
            }

            return;
          }

          if (action === 'variableChange') {
            if (id) {
              const parameter = parameters[id];
              if (parameter && parameter.data.key !== variable) {
                editor.update(() => node.setTextContent(`{{ ${parameter.data.key} }}`));
              }
            }

            return;
          }

          if (action === 'style') {
            const text = extractBracketContent(element.textContent || '');
            const variable = (text || '').split('.')[0] || '';

            const id = element.getAttribute('data-lexical-id');

            const objVariables = variables.map((i) => {
              const found = Object.values(parameters).find((p) => p.data.key === i && !p.data.hidden);
              return { key: i, id: found?.data.id! || '', type: found?.data.type };
            });

            const isVariable = (objVariables || [])?.find((x) => x.key === variable);
            if (role && role !== 'user' && isVariable?.type === 'image') {
              element.style.cssText = textStyle;
            } else {
              element.style.cssText = isVariable ? variableStyle : textStyle;
            }

            if (id) return;

            // 如果是变量，添加 data-lexical-id 属性
            if (isVariable && !id) {
              element.setAttribute('data-lexical-id', isVariable?.id || '');
            }
          }
        }}
      />
    </WithAwareness>
  );
}

export function usePromptEditorState({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: string, editorState: EditorState) => any;
  readOnly?: boolean;
}) {
  const cache = useRef<string>();
  const [state, setState] = useState<EditorState>();

  const emitChange = useDebounceFn(
    async ({ editorState }: { editorState: EditorState }) => {
      if (readOnly) return;

      const { content } = await editorState2Text(editorState);

      if (cache.current !== content) {
        cache.current = content;
        onChange(content, editorState);
      }
    },
    { wait: 300, trailing: true }
  );

  const setEditorState = useCallback(
    (state: EditorState) => {
      if (readOnly) return;

      setState(state);
      emitChange.run({ editorState: state });
    },
    [emitChange, setState, readOnly]
  );

  useAsyncEffect(async () => {
    if (cache.current !== value) {
      cache.current = value;

      setState(await text2EditorState(value));
    }
  }, [value, readOnly]);

  return { editorState: state, setEditorState };
}
