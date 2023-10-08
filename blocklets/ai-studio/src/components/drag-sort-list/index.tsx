import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { css } from '@emotion/css';
import { DragIndicator } from '@mui/icons-material';
import { Box } from '@mui/material';
import { useUpdate } from 'ahooks';
import { Reorder, useDragControls } from 'framer-motion';
import get from 'lodash/get';
import sortBy from 'lodash/sortBy';
import { ComponentProps, Key, ReactNode, memo, useCallback, useEffect, useId, useRef } from 'react';
import { ConnectDragPreview, ConnectDragSource, ConnectDropTarget, useDrag, useDrop } from 'react-dnd';

export function ReorderableListYjs<T>({
  list,
  renderItem,
  ...props
}: {
  list: { [key: string]: { index: number; data: T } };
  renderItem: (item: T, index: number) => ReactNode;
} & Omit<ComponentProps<typeof Reorder.Group>, 'onChange' | 'onReorder' | 'values'>) {
  const mapKeys = sortBy(Object.entries(list), (i) => i[1].index).map((i) => i[0]);

  return (
    <Reorder.Group
      as="div"
      values={mapKeys}
      onReorder={(keys) => {
        (getYjsValue(list) as Map<any>).doc!.transact(() => {
          keys.forEach((key, index) => (list[key]!.index = index));
        });
      }}
      {...props}>
      {mapKeys.map((key, index) => (
        <Item key={key} value={key}>
          {renderItem(list[key]!.data, index)}
        </Item>
      ))}
    </Reorder.Group>
  );
}

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

export function DragSortListYjs<T>({
  list,
  renderItem,
}: {
  list: { [key: string]: { index: number; data: T } };
  renderItem: (item: T, index: number, params: ItemRenderParams) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const type = useId();
  const update = useUpdate();

  const sortedIds = sortBy(Object.entries(list), (i) => i[1].index).map((i) => i[0]);

  const ids = useRef<string[]>(sortedIds);

  const setIds = useCallback(
    (v: string[]) => {
      ids.current = v;
      update();
    },
    [update]
  );

  const move = useCallback(
    ({ index: srcIndex }: { index: number }, { index: dstIndex }: { index: number }) => {
      const newIds = [...ids.current];
      newIds.splice(dstIndex, 0, ...newIds.splice(srcIndex, 1));
      setIds(newIds);
    },
    [setIds]
  );

  useEffect(() => {
    setIds(sortedIds);
  }, [sortedIds.join('-')]);

  const [{ isOver }, drop] = useDrop({
    accept: type,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    drop: () => {
      const doc = (getYjsValue(list) as Map<any>).doc!;
      doc.transact(() => {
        ids.current.forEach((id, index) => {
          const item = list[id];
          if (item) item.index = index;
        });
      });
    },
  });

  useEffect(() => {
    if (!isOver) setIds(sortedIds);
  }, [isOver]);

  drop(ref);

  return (
    <Box ref={ref}>
      {ids.current.map((id, index) => (
        <ItemDND type={type} key={id} id={id} index={index} itemIndex={(id) => ids.current.indexOf(id)} move={move}>
          {(params) => {
            const item = list[id];
            if (item) return renderItem(item.data, index, params);
            return null;
          }}
        </ItemDND>
      ))}
    </Box>
  );
}

type ItemRenderParams = {
  isDragging: boolean;
  drag: ConnectDragSource;
  drop: ConnectDropTarget;
  preview: ConnectDragPreview;
};

function ItemDND({
  id,
  index,
  type,
  children,
  itemIndex,
  move,
}: {
  id: string;
  index: number;
  type: string;
  children?: ReactNode | ((params: ItemRenderParams) => ReactNode);
  itemIndex: (id: string) => number;
  move: (src: { id: string; index: number }, dst: { id: string; index: number }) => void;
}) {
  const ref = useRef<HTMLElement>();

  const [{ isDragging }, drag, preview] = useDrag<{ id: string }, undefined, { isDragging: boolean }>({
    type,
    item: () => ({ id }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop<{ id: string }>({
    accept: type,
    hover(item, monitor) {
      if (!ref.current) {
        return;
      }

      const dragIndex = itemIndex(item.id);
      const hoverIndex = index;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      move({ id: item.id, index: dragIndex }, { id, index });
    },
  });

  if (typeof children === 'function') {
    return children({
      isDragging,
      drag,
      drop: (r) => {
        ref.current = r as any;
        return drop(r);
      },
      preview,
    });
  }

  drag(drop(preview(ref)));
  return <Box ref={ref}>{children}</Box>;
}
