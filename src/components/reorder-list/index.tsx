import { css } from '@emotion/css';
import { DragIndicator } from '@mui/icons-material';
import { Box } from '@mui/material';
import { DragControls, Reorder, useDragControls } from 'framer-motion';
import { get } from 'lodash';
import { ComponentProps, Key, ReactNode, memo } from 'react';

export default function ReorderList<T>({
  list,
  itemKey,
  customDragControl,
  onChange,
  renderItem,
  ...props
}: {
  list: T[];
  itemKey: keyof T | ((item: T) => Key);
  customDragControl?: boolean;
  onChange: (data: T[]) => void;
  renderItem: (item: T, index: number, ctrl: DragControls) => ReactNode;
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
          {(ctrl) => (
            <>
              {!customDragControl && (
                <Box
                  sx={{ display: 'flex', alignItems: 'center', mr: 0.5, cursor: 'grab', userSelect: 'none' }}
                  onPointerDown={(e) => ctrl.start(e)}>
                  <DragIndicator sx={{ fontSize: 18, color: 'grey.700' }} />
                </Box>
              )}
              {renderItem(map[key], index, ctrl)}
            </>
          )}
        </Item>
      ))}
    </Reorder.Group>
  );
}

const Item = memo(({ value, children }: { value: Key; children: (ctrl: DragControls) => ReactNode }) => {
  const ctrl = useDragControls();

  return (
    <Reorder.Item
      as="div"
      dragListener={false}
      dragControls={ctrl}
      value={value}
      className={css`
        display: flex;
      `}>
      {children(ctrl)}
    </Reorder.Item>
  );
});
