import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  Autocomplete,
  AutocompleteProps,
  AutocompleteRenderInputParams,
  MenuItem,
  TextField,
  createFilterOptions,
} from '@mui/material';
import { useMemo } from 'react';

import { Template } from '../../../api/src/store/templates';

const filter = createFilterOptions<Pick<Template, 'id' | 'name'>>();

export interface TemplateAutocompleteProps<
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined
> extends Omit<
    AutocompleteProps<Pick<Template, 'id' | 'name'>, Multiple, DisableClearable, FreeSolo>,
    | 'inputValue'
    | 'onInputChange'
    | 'getOptionLabel'
    | 'options'
    | 'isOptionEqualToValue'
    | 'filterOptions'
    | 'loading'
    | 'renderInput'
  > {
  options: Pick<Template, 'id' | 'name'>[];
  createTemplate?: (input: Pick<Template, 'name'>) => Promise<Pick<Template, 'id' | 'name'>>;
  renderInput?: (params: AutocompleteRenderInputParams) => React.ReactNode;
}

export default function TemplateAutocomplete<
  Multiple extends boolean | undefined = false,
  DisableClearable extends boolean | undefined = false,
  FreeSolo extends boolean | undefined = false
>({
  options: templates,
  createTemplate,
  ...props
}: TemplateAutocompleteProps<Multiple, DisableClearable, FreeSolo> & {}) {
  const { t } = useLocaleContext();

  const options = useMemo(() => templates.map((i) => ({ id: i.id, name: i.name })), [templates]);

  const { renderInput = (params) => <TextField {...params} /> } = props;

  return (
    <Autocomplete
      {...props}
      onChange={(e, newValue, reason) => {
        const inputValue = typeof newValue === 'string' ? newValue : (newValue as any)?.inputValue;

        if (!Array.isArray(newValue) && inputValue) {
          const t = options.find((i) => i.name === inputValue);
          if (t) {
            props.onChange?.(e, t as any, reason);
            return;
          }

          createTemplate?.({ name: inputValue }).then((template) => {
            props.onChange?.(e, { id: template.id, name: template.name } as any, reason);
          });
        } else {
          props.onChange?.(e, newValue, reason);
        }
      }}
      options={options}
      clearOnBlur
      selectOnFocus
      handleHomeEndKeys
      getOptionLabel={(v) => (typeof v === 'string' ? v : (v as any).inputValue || v.name || '')}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      filterOptions={(options, params) => {
        const filtered = filter(options, params);

        const { inputValue } = params;
        const isExisting = options.some((option) => inputValue === option.name);
        if (inputValue !== '' && !isExisting) {
          filtered.push({
            id: '',
            inputValue,
            name: `${t('form.new')} "${inputValue}"`,
          } as any);
        }

        return filtered;
      }}
      renderOption={(props, option) => (
        <MenuItem {...props} key={option.id}>
          {option.name || t('unnamed')}
        </MenuItem>
      )}
      renderInput={renderInput}
    />
  );
}
