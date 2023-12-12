import { AssistantYjs } from '@blocklet/ai-runtime';
import PromptEditor, { EditorState } from '@blocklet/prompt-editor';
import { editorState2Text, text2EditorState } from '@blocklet/prompt-editor/utils';
import { useAsyncEffect, useThrottleFn } from 'ahooks';
import { ComponentProps, useCallback, useRef, useState } from 'react';

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
  const { editorState, setEditorState } = usePromptEditorState({
    value: value || '',
    onChange,
    readOnly,
  });

  const variablePickerProps = useVariablesEditorOptions(assistant);

  return (
    <PromptEditor
      {...props}
      value={editorState}
      onChange={setEditorState}
      variablePickerProps={variablePickerProps}
      ContentProps={{
        ...props.ContentProps,
        sx: {
          bgcolor: 'grey.100',
          p: 1,
          borderRadius: 1,
          ...props.ContentProps?.sx,
        },
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
