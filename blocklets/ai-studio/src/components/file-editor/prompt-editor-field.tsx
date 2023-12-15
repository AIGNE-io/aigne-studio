import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import PromptEditor, { EditorState } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { Box, Button, Paper, Stack } from '@mui/material';
import { useAsyncEffect, useThrottleFn } from 'ahooks';
import { ComponentProps, useCallback, useMemo, useRef, useState } from 'react';

import useVariablesEditorOptions from './use-variables-editor-options';

export default function PromptEditorField({
  assistant,
  value,
  onChange,
  readOnly,
  ...props
}: {
  assistant?: AssistantYjs;
  value?: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
} & Omit<ComponentProps<typeof PromptEditor>, 'value' | 'onChange'>) {
  const { t } = useLocaleContext();
  const { editorState, setEditorState } = usePromptEditorState({ value: value || '', onChange, readOnly });
  const { options, variables, addParameter } = useVariablesEditorOptions(assistant);

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
      horoscope: t('form.parameter.typeHoroscope'),
    };
  }, [t]);

  return (
    <PromptEditor
      variables={variables}
      {...props}
      value={editorState}
      onChange={setEditorState}
      variablePickerProps={{ options }}
      ContentProps={{
        ...props.ContentProps,
        sx: { bgcolor: 'grey.100', p: 1, borderRadius: 1, ...props.ContentProps?.sx },
      }}
      popperElement={({ text, handleClose }) => {
        if ((variables || []).includes(text)) {
          const parameter = getParameters(text);

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
                <Box>{`${t('form.parameter.label')}: ${parameter?.label || text}`}</Box>
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
                {t('nonExistentVariable', { data: text })}
              </Box>

              <Stack direction="row" gap={1} justifyContent="flex-end">
                <Button
                  sx={{ p: 0 }}
                  onClick={() => {
                    addParameter(text);
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
  );
}

export function usePromptEditorState({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (value: string) => any;
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
        onChange(content);
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
