import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { css } from '@emotion/css';
import styled from '@emotion/styled';
import { Add, Delete } from '@mui/icons-material';
import { Box, Button, Input } from '@mui/material';
import equal from 'fast-deep-equal';
import produce from 'immer';
import { nanoid } from 'nanoid';
import { memo, useEffect, useState } from 'react';

import { SelectParameter } from '../../../api/src/store/templates';
import ReorderableList from '../drag-sort-list';

export default function SelectOptionsConfig({
  options = [],
  onChange,
}: {
  options: SelectParameter['options'];
  onChange: (options: SelectParameter['options']) => void;
}) {
  const { t } = useLocaleContext();

  const [cachedOptions, setCachedOptions] = useState(options);

  useEffect(() => {
    if (!equal(options, cachedOptions)) {
      onChange(cachedOptions);
    }
  }, [cachedOptions]);

  useEffect(() => {
    if (!equal(options, cachedOptions)) {
      setCachedOptions(options);
    }
  }, [options]);

  return (
    <Box>
      <Options options={cachedOptions} onChange={setCachedOptions} />

      <Button
        fullWidth
        size="small"
        startIcon={<Add />}
        onClick={() => {
          const id = nanoid(16);
          setCachedOptions([...options, { id, label: '', value: '' }]);
          setTimeout(() => document.getElementById(`option-label-${id}`)?.focus());
        }}>
        {t('form.parameter.addOption')}
      </Button>
    </Box>
  );
}

const Options = memo(
  ({
    options,
    onChange,
  }: {
    options: NonNullable<SelectParameter['options']>;
    onChange: (options: NonNullable<SelectParameter['options']>) => void;
  }) => {
    return (
      <ReorderableList
        list={options}
        onChange={onChange}
        itemKey="id"
        className={css`
          > div {
            display: 'flex';
            align-items: center;
          }
        `}
        renderItem={(item, index) => (
          <Option
            option={item}
            onChange={(option) =>
              onChange(
                produce(options, (draft) => {
                  draft[index] = option;
                })
              )
            }
            onDelete={() =>
              onChange(
                produce(options, (draft) => {
                  draft.splice(index, 1);
                })
              )
            }
          />
        )}
      />
    );
  }
);

function Option({
  option,
  onChange,
  onDelete,
}: {
  option: NonNullable<SelectParameter['options']>[0];
  onChange: (option: NonNullable<SelectParameter['options']>[0]) => void;
  onDelete: () => void;
}) {
  const { t } = useLocaleContext();

  return (
    <Item>
      <Input
        inputProps={{ id: `option-label-${option.id}` }}
        disableUnderline
        placeholder={t('form.parameter.label')}
        value={option.label}
        onChange={(e) => onChange({ ...option, label: e.target.value })}
      />
      <Input
        sx={{ ml: 0.5 }}
        disableUnderline
        placeholder={t('form.parameter.value')}
        value={option.value}
        onChange={(e) => onChange({ ...option, value: e.target.value })}
      />

      <Box>
        <Button sx={{ minWidth: 0, p: 0.2 }} onClick={onDelete}>
          <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
        </Button>
      </Box>
    </Item>
  );
}

const Item = styled(Box)`
  display: flex;
  align-items: center;
  margin: 4px 0;

  .MuiInput-root {
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
    flex: 1;

    input {
      padding: 4px 4px;
    }
  }
`;
