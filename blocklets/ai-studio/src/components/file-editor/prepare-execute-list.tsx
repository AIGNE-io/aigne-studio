import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { ExecuteBlockYjs } from 'api/src/store/projects';
import { useCallback } from 'react';
import { AssistantYjs } from 'src/pages/project/yjs-state';

import { DragSortItemContainer, DragSortListYjs } from '../drag-sort-list';
import ExecuteBlockForm from './execute-block';

export default function PrepareExecuteList({
  projectId,
  gitRef,
  value,
  assistant,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  value: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  assistant: AssistantYjs;
  readOnly?: boolean;
}) {
  const onDelete = useCallback(
    (id: string) => {
      const doc = (getYjsValue(value) as Map<any>).doc!;
      doc.transact(() => {
        delete value[id];
        Object.values(value).forEach((i, index) => (i.index = index));
      });
    },
    [value]
  );

  return (
    <DragSortListYjs
      sx={{ gap: 2 }}
      disabled={readOnly}
      list={value}
      renderItem={(block, _, params) => {
        return (
          <DragSortItemContainer
            preview={params.preview}
            drop={params.drop}
            drag={params.drag}
            disabled={readOnly}
            isDragging={params.isDragging}
            onDelete={() => onDelete(block.id)}>
            <ExecuteBlockForm
              assistant={assistant}
              projectId={projectId}
              gitRef={gitRef}
              value={block}
              readOnly={readOnly}
            />
          </DragSortItemContainer>
        );
      }}
    />
  );
}
