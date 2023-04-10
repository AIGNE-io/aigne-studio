import { DragIndicator } from '@mui/icons-material';
import { Box, BoxProps, styled } from '@mui/material';
import type { ReactNode } from 'react';
import { useDrag, useDrop } from 'react-dnd';

export function DragSortListItem({
  htmlId,
  dragType,
  dropType = dragType,
  index,
  id,
  children,
  move,
  actions,
  ...props
}: {
  htmlId?: string;
  dragType: string;
  dropType: string | string[];
  index: number;
  id: string;
  children: ReactNode;
  actions?: ReactNode;
  move: (id: string, index: number) => void;
} & BoxProps) {
  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: dragType,
      item: { id, index },
      options: { dropEffect: 'move' },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
      end: (item, monitor) => {
        const { id, index } = item;
        const didDrop = monitor.didDrop();
        if (!didDrop) {
          move(id, index);
        }
      },
    }),
    [dragType, id, index, move]
  );

  const [, drop] = useDrop(
    () => ({
      accept: dropType,
      hover(payload: { id: string }) {
        if (payload.id !== id) {
          move(payload.id, index);
        }
      },
    }),
    [dropType, id, index, move]
  );

  const opacity = isDragging ? 0.3 : 1;

  return (
    <ItemRoot {...props} id={htmlId} ref={(node: HTMLDivElement) => drop(preview(node))} sx={{ ...props.sx, opacity }}>
      <div className="drag" ref={(node) => drag(node)}>
        <DragIndicator />
      </div>
      <div className="content">{children}</div>
      <div className="actions" onClick={(e) => e.stopPropagation()}>
        {actions}
      </div>
    </ItemRoot>
  );
}

const ItemRoot = styled(Box)`
  display: flex;
  align-items: center;
  user-select: none;
  cursor: pointer;
  position: relative;

  > .drag,
  > .actions {
    line-height: 1;

    svg {
      font-size: 16px;
      vertical-align: middle;
    }
  }

  > .drag {
    cursor: grab;
    opacity: 0.5;
  }

  > .actions {
    display: flex;
    align-items: center;
    overflow: hidden;
    margin-left: 4px;

    > * {
      opacity: 0.5;
      cursor: pointer;

      &:hover {
        opacity: 1;
      }
    }
  }

  > .content {
    flex: 1;
  }
`;
