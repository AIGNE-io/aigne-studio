import {
  Autocomplete,
  AutocompleteProps,
  AutocompleteRenderInputParams,
  CircularProgress,
  MenuItem,
  TextField,
} from '@mui/material';
import { useReactive, useThrottleFn } from 'ahooks';
import { useCallback, useEffect } from 'react';

import { Template } from '../../../api/src/store/templates';
import { getTemplates } from '../../libs/templates';

export interface TemplateAutocompleteProps<
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined
> extends Omit<
    AutocompleteProps<Pick<Template, 'name'> & { id: string }, Multiple, DisableClearable, FreeSolo>,
    | 'inputValue'
    | 'onInputChange'
    | 'options'
    | 'getOptionLabel'
    | 'isOptionEqualToValue'
    | 'filterOptions'
    | 'loading'
    | 'renderInput'
  > {
  renderInput?: (params: AutocompleteRenderInputParams) => React.ReactNode;
}

export default function TemplateAutocomplete<
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false
>(props: TemplateAutocompleteProps<Multiple, DisableClearable, FreeSolo>) {
  const state = useReactive<{
    searching: boolean;
    searchKey: number;
    resultKey: number;
    keyword: string;
    options: (Pick<Template, 'name'> & { id: string })[];
  }>({ searching: false, searchKey: 0, resultKey: 0, keyword: '', options: [] });

  const search = useCallback(async (keyword: string) => {
    const key = state.searchKey;

    try {
      const options = (await getTemplates({ search: keyword, limit: 20 })).templates;
      if (key > state.resultKey) {
        state.resultKey = key;
        state.options = options.map((i) => ({ id: i._id, name: i.name }));
      }
    } finally {
      if (key === state.searchKey) {
        state.searching = false;
      }
    }
  }, []);

  const { run } = useThrottleFn(search, { wait: 1000 });

  useEffect(() => {
    state.searchKey += 1;
    state.searching = true;
    run(state.keyword);
  }, [state.keyword]);

  const { renderInput = (params) => <TextField {...params} /> } = props;

  return (
    <Autocomplete
      {...props}
      inputValue={state.keyword}
      onInputChange={(_, keyword) => (state.keyword = keyword)}
      options={state.options}
      getOptionLabel={(v) => (typeof v === 'string' ? v : v.name || '')}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      filterOptions={(o) => o}
      renderOption={(props, option) => (
        <MenuItem {...props} key={option.id}>
          {option.name}
        </MenuItem>
      )}
      loading={state.searching}
      renderInput={(params) =>
        renderInput({
          ...params,
          InputProps: {
            ...params.InputProps,
            endAdornment: (
              <>
                {state.searching && <CircularProgress size={20} />}
                {params.InputProps.endAdornment}
              </>
            ),
          },
        })
      }
    />
  );
}
