import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  AssistantYjs,
  isImageAssistant,
  isPromptAssistant,
  parseDirectivesOfTemplate,
} from '@blocklet/ai-runtime/types';
import PromptEditor, { EditorState } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { Box, Button, Paper, Stack } from '@mui/material';
import { useAsyncEffect, useDebounceFn, useThrottleFn } from 'ahooks';
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react';

import WithAwareness from '../awareness/with-awareness';
import useVariablesEditorOptions from './use-variables-editor-options';

function extractBracketContent(text: string) {
  const pattern = /^\{\{(.*)\}\}$/;
  const match = pattern.exec(text);
  return ((match ? match[1] : '') || '').trim();
}

const variableStyle = `
  color: rgb(234 179 8/1);
  font-weight: bold;
  cursor: pointer;
`;

const textStyle = `
  color: #ef5350;
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
} & Omit<ComponentProps<typeof PromptEditor>, 'value' | 'onChange'>) {
  const { t } = useLocaleContext();
  const { from, options, variables, addParameter, updateParameter } = useVariablesEditorOptions(assistant);

  const parameterChange = useDebounceFn(
    async () => {
      if (assistant && (isPromptAssistant(assistant) || isImageAssistant(assistant))) {
        const textNodes = document.querySelectorAll('[data-lexical-variable]');
        const variables = new Set(parseDirectivesOfTemplate(assistant).map((i) => i.name.split('.')[0]!));

        const map = [...textNodes].reduce(
          (acc, node) => {
            const id = node.getAttribute('data-lexical-id');
            const text = extractBracketContent(node.textContent || '').trim();
            if (id) acc[id] = text;
            return acc;
          },
          {} as { [key: string]: string }
        );

        // 更新变量
        Object.entries(map).forEach(([id, text]) => {
          const currentVariables = Object.values(assistant.parameters ?? {}).filter((p) => p.data.from === from);
          const found = currentVariables.find((p) => p.data.id === id);
          if (found?.data?.id) {
            updateParameter(found?.data.id, text);
          }
        });

        // 添加变量
        const currentVariables = Object.values(assistant.parameters ?? {}).filter((p) => p.data.from === from);
        variables.forEach((variable) => {
          if (variable && !currentVariables.some((v) => v?.data?.key === variable)) {
            addParameter(variable, { from });
          }
        });

        // 删除变量
        Object.values(assistant.parameters ?? {})
          .filter((p) => p.data.from === from)
          .forEach((variable) => {
            const key = variable?.data?.key;
            if (key && !variables.has(key)) delete assistant.parameters?.[variable?.data.id];
          });
      }
    },
    { wait: 500, trailing: true }
  );

  const { editorState, setEditorState } = usePromptEditorState({
    value: value || '',
    onChange: (value) => {
      onChange(value);
      parameterChange.run();
    },
    readOnly,
  });

  const getParameters = (text: string) => {
    const list = Object.values(assistant?.parameters || []).map((i) => i.data.key);
    const index = list.findIndex((x) => x === text);
    return Object.values(assistant?.parameters || [])[index]?.data;
  };

  const typeMap = useMemo(() => {
    return {
      string: t('text'),
      multiline: t('multiline'),
      number: t('multiline'),
      select: t('select'),
      language: t('language'),
      source: t('source'),
      llmInputMessages: t('llmInputMessages'),
      llmInputTools: t('llmInputTools'),
      llmInputToolChoice: t('llmInputToolChoice'),
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

          if ((variables || []).includes(variable)) {
            const parameter = getParameters(variable);

            const type = (parameter as { multiline: boolean })?.multiline ? 'multiline' : parameter?.type || 'string';

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
        onChangeVariableNode={({ editor, element, node }) => {
          const text = extractBracketContent(element.textContent || '');
          const variable = (text || '').split('.')[0] || '';

          const id = element.getAttribute('data-lexical-id');
          const parameters = assistant?.parameters || {};

          const objVariables = variables.map((i) => {
            const found = Object.values(parameters).find((p) => p.data.key === i);
            return { key: i, id: found?.data.id! || '' };
          });

          if (id) {
            const parameter = parameters[id];
            if (parameter) {
              editor.update(() => {
                if (parameter.data.key !== variable) node.setTextContent(`{{ ${parameter.data.key} }}`);
              });
            }

            return;
          }

          const isVariable = (objVariables || [])?.find((x) => x.key === variable);
          element.style.cssText = isVariable ? variableStyle : textStyle;
          // 如果是变量，添加 data-lexical-id 属性
          if (isVariable && !id) {
            element.setAttribute('data-lexical-id', isVariable?.id || '');
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

  const emitChange = useThrottleFn(
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
