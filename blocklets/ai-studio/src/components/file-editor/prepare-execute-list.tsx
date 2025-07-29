import { AssistantYjs, ExecuteBlockYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Stack } from '@mui/material';
import { sortBy } from 'lodash';
import { useCallback } from 'react';

import { DragSortItemContainer, DragSortListYjs } from '../drag-sort-list';
import ExecuteBlockForm from './execute-block';

export default function PrepareExecuteList({
  projectId,
  gitRef,
  value,
  assistant,
  readOnly = undefined,
  compareAssistant = undefined,
  isRemoteCompare = undefined,
}: {
  projectId: string;
  gitRef: string;
  value: { [key: string]: { index: number; data: ExecuteBlockYjs } };
  assistant: AssistantYjs;
  readOnly?: boolean;
  compareAssistant?: AssistantYjs;
  isRemoteCompare?: boolean;
}) {
  const onDelete = useCallback(
    (id: string) => {
      const doc = (getYjsValue(value) as Map<any>).doc!;
      doc.transact(() => {
        delete value[id];
        sortBy(Object.values(value), 'index').forEach((i, index) => (i.index = index));
      });
    },
    [value]
  );

  return (
    <DragSortListYjs
      sx={{ gap: 2 }}
      component={Stack}
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
              path={[assistant.id, 'prepareExecutes', block.id]}
              gitRef={gitRef}
              value={block}
              readOnly={readOnly}
              compareAssistant={compareAssistant}
              isRemoteCompare={isRemoteCompare}
              from="prepare-execute-list"
            />
          </DragSortItemContainer>
        );
      }}
    />
  );
}
