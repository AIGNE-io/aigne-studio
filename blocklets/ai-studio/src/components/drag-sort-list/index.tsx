import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { cx } from '@emotion/css';
import { Icon } from '@iconify-icon/react';
import GripVerticalIcon from '@iconify-icons/tabler/grip-vertical';
import TrashIcon from '@iconify-icons/tabler/trash';
import { Box, Stack, StackProps, Tooltip } from '@mui/material';
import { useUpdate } from 'ahooks';
import sortBy from 'lodash/sortBy';
import { ReactNode, useCallback, useEffect, useId, useRef } from 'react';
import { ConnectDragPreview, ConnectDragSource, ConnectDropTarget, useDrag, useDrop } from 'react-dnd';

export function DragSortListYjs<T>({
  disabled,
  list,
  renderItem,
  ...props
}: {
  disabled?: boolean;
  list: { [key: string]: { index: number; data: T } };
  renderItem: (item: T, index: number, params: DragSortItemRenderParams) => ReactNode;
} & StackProps) {
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
    canDrop: () => !disabled,
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
    <Box {...props} ref={ref} className={cx(isOver && 'isDragging')}>
      {ids.current.map((id, index) => (
        <ItemDND
          key={id}
          type={type}
          disabled={disabled}
          id={id}
          index={index}
          itemIndex={(id) => ids.current.indexOf(id)}
          move={move}>
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

export type DragSortItemRenderParams = {
  isDragging: boolean;
  drag: ConnectDragSource;
  drop: ConnectDropTarget;
  preview: ConnectDragPreview;
};

function ItemDND({
  disabled,
  id,
  index,
  type,
  children,
  itemIndex,
  move,
}: {
  disabled?: boolean;
  id: string;
  index: number;
  type: string;
  children?: ReactNode | ((params: DragSortItemRenderParams) => ReactNode);
  itemIndex: (id: string) => number;
  move: (src: { id: string; index: number }, dst: { id: string; index: number }) => void;
}) {
  const ref = useRef<HTMLElement>();

  const [{ isDragging }, drag, preview] = useDrag<{ id: string }, undefined, { isDragging: boolean }>({
    type,
    item: () => ({ id }),
    canDrag: () => !disabled,
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop<{ id: string }>({
    accept: type,
    canDrop: () => !disabled,
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

export function DragSortItemContainer({
  drop,
  preview,
  drag,
  disabled,
  isDragging,
  children,
  onDelete,
  actions,
}: {
  drop: ConnectDropTarget;
  preview: ConnectDragPreview;
  drag: ConnectDragSource;
  disabled?: boolean;
  isDragging?: boolean;
  children?: ReactNode;
  onDelete?: () => any;
  actions?: ReactNode;
}) {
  const { t } = useLocaleContext();

  return (
    <Box ref={drop} sx={{ ':hover .hover-visible': { maxHeight: '100%' } }}>
      <Box sx={{ position: 'relative' }}>
        <Box
          ref={preview}
          sx={{
            flex: 1,
            borderRadius: 1,
            bgcolor: isDragging ? 'action.hover' : 'background.paper',
            opacity: 0.9999, // NOTE: make preview effective
          }}>
          {children}
        </Box>

        {!disabled && (
          <Box
            className="hover-visible"
            sx={{
              maxHeight: 0,
              overflow: 'hidden',
              position: 'absolute',
              left: -42,
              top: 1,
              width: 48,
              display: 'flex',
              justifyContent: 'center',
            }}>
            <Stack
              sx={{
                border: '1px solid #E5E7EB',
                bgcolor: '#fff',
                borderRadius: 1,
                p: 1,
                gap: 1.5,
                cursor: 'pointer',
              }}>
              <Tooltip title={t('dragSort')} disableInteractive placement="top">
                <Box ref={drag} className="center">
                  <Box component={Icon} icon={GripVerticalIcon} sx={{ color: 'grey.500' }} />
                </Box>
              </Tooltip>

              {actions}

              {onDelete && (
                <Tooltip title={t('delete')} disableInteractive placement="top">
                  <Box onClick={onDelete} className="center">
                    <Box component={Icon} icon={TrashIcon} sx={{ color: 'grey.500' }} />
                  </Box>
                </Tooltip>
              )}
            </Stack>
          </Box>
        )}
      </Box>
    </Box>
  );
}
