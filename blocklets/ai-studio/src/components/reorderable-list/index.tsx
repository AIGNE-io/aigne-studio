import { css } from '@emotion/css';
import { DragIndicator } from '@mui/icons-material';
import { Box } from '@mui/material';
import { Reorder, useDragControls } from 'framer-motion';
import { get } from 'lodash';
import { ComponentProps, Key, ReactNode, memo } from 'react';

export default function ReorderableList<T>({
  list,
  itemKey,
  onChange,
  renderItem,
  ...props
}: {
  list: T[];
  itemKey: keyof T | ((item: T) => Key);
  onChange: (data: T[]) => void;
  renderItem: (item: T, index: number) => ReactNode;
} & Omit<ComponentProps<typeof Reorder.Group>, 'onChange' | 'onReorder' | 'values'>) {
  const getItemKey = typeof itemKey === 'function' ? itemKey : (item: T) => get(item, itemKey);

  const map = Object.fromEntries(list.map((i) => [getItemKey(i), i]));
  const mapKeys = Object.keys(map);

  return (
    <Reorder.Group
      as="div"
      values={mapKeys}
      onReorder={(keys) => {
        onChange(keys.map((key) => map[key]));
      }}
      {...props}>
      {mapKeys.map((key, index) => (
        <Item key={key} value={key}>
          {renderItem(map[key], index)}
        </Item>
      ))}
    </Reorder.Group>
  );
}

const Item = memo(({ value, children }: { value: Key; children: ReactNode }) => {
  const ctrl = useDragControls();

  return (
    <Reorder.Item
      as="div"
      dragListener={false}
      dragControls={ctrl}
      value={value}
      className={css`
        display: flex;
        align-items: baseline;
      `}>
      <Box
        sx={{ display: 'flex', alignItems: 'center', mr: 0.5, cursor: 'grab', userSelect: 'none' }}
        onPointerDown={(e) => ctrl.start(e)}>
        <DragIndicator sx={{ fontSize: 18, color: 'grey.700' }} />
      </Box>

      {children}
    </Reorder.Item>
  );
});
