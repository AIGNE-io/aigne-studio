import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, isPromptAssistant, parseDirectivesOfTemplate } from '@blocklet/ai-runtime/types';
import PromptEditor, { EditorState } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { Box, Button, Paper, Stack } from '@mui/material';
import { useAsyncEffect, useThrottleFn } from 'ahooks';
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react';

import WithAwareness from '../awareness/with-awareness';
import useVariablesEditorOptions from './use-variables-editor-options';

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
  const { from, options, variables, addParameter } = useVariablesEditorOptions(assistant);

  const parameterChange = useThrottleFn(
    async () => {
      if (assistant && isPromptAssistant(assistant)) {
        const variables = parseDirectivesOfTemplate(assistant);
        const currentVariables = Object.values(assistant.parameters ?? {}).filter((p) => p?.data?.from === from);

        // 添加新增的变量
        variables.forEach((variable) => {
          const name = (variable?.name || '').split('.')[0];
          if (name && !currentVariables.some((v) => v?.data?.key === name)) {
            addParameter(name, { from });
          }
        });

        // 删除移除的变量
        (currentVariables || []).forEach((variable) => {
          const key = variable?.data?.key;
          if (assistant.parameters && key && !variables.some((v) => (v?.name || '').split('.')[0] === key)) {
            delete assistant.parameters[variable?.data.id];
          }
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
      string: t('form.parameter.typeText'),
      multiline: t('form.parameter.typeTextMultiline'),
      number: t('form.parameter.typeTextMultiline'),
      select: t('form.parameter.typeSelect'),
      language: t('form.parameter.typeLanguage'),
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
                  <Box>{`${t('form.parameter.type')}: ${typeMap[type]}`}</Box>
                  <Box>{`${t('form.parameter.label')}: ${parameter?.label || variable}`}</Box>
                  {!!parameter?.placeholder && (
                    <Box>{`${t('form.parameter.placeholder')}: ${parameter?.placeholder || ''}`}</Box>
                  )}
                  {!!parameter?.defaultValue && (
                    <Box>{`${t('form.parameter.defaultValue')}: ${parameter?.defaultValue || ''}`}</Box>
                  )}
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
