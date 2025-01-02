import type { AssistantYjs } from '@blocklet/ai-runtime/types';
import { isAssistant } from '@blocklet/ai-runtime/types';
import type { AutocompleteProps, TextFieldProps } from '@mui/material';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useReactive, useThrottleEffect } from 'ahooks';
import { useState } from 'react';

import { useProjectStore } from '../../pages/project/yjs-state';

export default function TagsAutoComplete({
  projectId,
  gitRef,
  label,
  ...props
}: { projectId: string; gitRef: string; placeholder?: string } & Partial<
  AutocompleteProps<string, true, false, true> & Pick<TextFieldProps, 'label'>
>) {
  const { store } = useProjectStore(projectId, gitRef);

  const [search, setSearch] = useState('');
  const state = useReactive<{ open: boolean; loading: boolean; options: string[] }>({
    open: false,
    loading: false,
    options: [],
  });

  useThrottleEffect(
    () => {
      if (!state.open || state.loading) {
        return;
      }

      (async () => {
        state.loading = true;
        try {
          const tags = [
            ...new Set(
              Object.values(store.files)
                .filter((i): i is AssistantYjs => !!i && isAssistant(i))
                .flatMap((i) => i.tags)
            ),
          ];

          state.options = tags.filter((i): i is string => !!i);
        } finally {
          state.loading = false;
        }
      })();
    },
    [state.open, search],
    { wait: 1000 }
  );

  return (
    <Autocomplete
      size="small"
      freeSolo
      autoSelect
      autoHighlight
      multiple
      selectOnFocus
      open={state.open}
      onOpen={() => (state.open = true)}
      onClose={() => (state.open = false)}
      options={state.options}
      loading={state.loading}
      inputValue={search}
      onInputChange={(_, keyword) => setSearch(keyword)}
      renderInput={(params) => (
        <TextField
          label={label}
          {...params}
          placeholder={props.placeholder}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {state.loading && <CircularProgress color="inherit" size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      {...props}
    />
  );
}
