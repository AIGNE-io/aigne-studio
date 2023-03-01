import { Autocomplete, AutocompleteProps, CircularProgress, TextField } from '@mui/material';
import { useReactive, useThrottleEffect } from 'ahooks';
import { useState } from 'react';

import { getTags } from '../../libs/tags';

const SEARCH_PAGE_SIZE = 50;

export default function TagsAutoComplete(
  props: Pick<AutocompleteProps<string, true, false, true>, 'value' | 'onChange'>
) {
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
          const { tags } = await getTags({ limit: SEARCH_PAGE_SIZE, search });
          state.options = tags.map((i) => i.name);
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
      {...props}
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
          label="Tags"
          {...params}
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
    />
  );
}
