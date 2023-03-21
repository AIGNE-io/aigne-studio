import {
  Autocomplete,
  AutocompleteProps,
  AutocompleteRenderInputParams,
  ChipTypeMap,
  CircularProgress,
  MenuItem,
  TextField,
} from '@mui/material';
import { useReactive, useThrottleFn } from 'ahooks';
import { useCallback, useEffect } from 'react';

export interface NominatimLocationSearchProps<
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined,
  ChipComponent extends React.ElementType = ChipTypeMap['defaultComponent']
> extends Omit<
    AutocompleteProps<NominatimLocationItem, Multiple, DisableClearable, FreeSolo, ChipComponent>,
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

export interface NominatimLocationItem {
  id: number;
  longitude: number;
  latitude: number;
  name: string;
}

export default function NominatimLocationSearch<
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false
>(props: NominatimLocationSearchProps<Multiple, DisableClearable, FreeSolo>) {
  const state = useReactive<{
    searching: boolean;
    searchKey: number;
    resultKey: number;
    keyword: string;
    options: NominatimLocationItem[];
  }>({ searching: false, searchKey: 0, resultKey: 0, keyword: '', options: [] });

  const search = useCallback(async (keyword: string) => {
    const key = state.searchKey;

    try {
      if (!keyword.trim()) {
        state.options = [];
        return;
      }

      const url = new URL('https://nominatim.openstreetmap.org/search');
      url.searchParams.set('q', keyword);
      url.searchParams.set('polygon_geojson', '1');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '10');
      url.searchParams.set('accept-language', 'zh-CN');
      url.searchParams.set('polygon_geojson', '0');
      const options = await fetch(url.toString())
        .then((res) => res.json())
        .then((res) =>
          res.map((i: any) => ({
            id: i.place_id,
            longitude: i.lon,
            latitude: i.lat,
            name: i.display_name,
          }))
        );
      if (key > state.resultKey) {
        state.resultKey = key;
        state.options = options;
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
      isOptionEqualToValue={(o, v) => o.id === v.id || (o.longitude === v.longitude && o.latitude === v.latitude)}
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
