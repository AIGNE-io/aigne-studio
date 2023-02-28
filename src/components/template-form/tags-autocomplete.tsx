import { Autocomplete, AutocompleteProps, CircularProgress, TextField } from '@mui/material';
import { useReactive } from 'ahooks';
import { useEffect } from 'react';

import { getTags } from '../../libs/tags';

export default function TagsAutoComplete(
  props: Pick<AutocompleteProps<string, true, false, true>, 'value' | 'onChange'>
) {
  const state = useReactive<{ open: boolean; loading: boolean; options: string[] }>({
    open: false,
    loading: false,
    options: [],
  });

  useEffect(() => {
    if (!state.open || state.loading) {
      return;
    }

    (async () => {
      state.loading = true;
      try {
        const { tags } = await getTags({ offset: 0, limit: 20 });
        state.options = tags.map((i) => i.name);
      } finally {
        state.loading = false;
      }
    })();
  }, [state.open]);

  return (
    <Autocomplete
      {...props}
      size="small"
      freeSolo
      autoSelect
      multiple
      selectOnFocus
      open={state.open}
      onOpen={() => (state.open = true)}
      onClose={() => (state.open = false)}
      options={state.options}
      loading={state.loading}
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
