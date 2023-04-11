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

import { TemplateInput } from '../../../api/src/routes/templates';
import { Template } from '../../../api/src/store/templates';

const filter = createFilterOptions<Pick<Template, 'name'> & { id: string }>();

export interface TemplateAutocompleteProps<
  Multiple extends boolean | undefined,
  DisableClearable extends boolean | undefined,
  FreeSolo extends boolean | undefined
> extends Omit<
    AutocompleteProps<Pick<Template, 'name'> & { id: string }, Multiple, DisableClearable, FreeSolo>,
    | 'inputValue'
    | 'onInputChange'
    | 'getOptionLabel'
    | 'options'
    | 'isOptionEqualToValue'
    | 'filterOptions'
    | 'loading'
    | 'renderInput'
  > {
  options: Template[];
  createTemplate?: (input: TemplateInput) => Promise<Template>;
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

  const options = useMemo(() => templates.map((i) => ({ id: i._id, name: i.name })), [templates]);

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
            props.onChange?.(e, { id: template._id, name: template.name } as any, reason);
          });
        } else {
          props.onChange?.(e, newValue, reason);
        }
      }}
      options={options}
      clearOnBlur
      selectOnFocus
      handleHomeEndKeys
      getOptionLabel={(v) => (typeof v === 'string' ? v : v.name || '')}
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
          {option.name}
        </MenuItem>
      )}
      renderInput={renderInput}
    />
  );
}
