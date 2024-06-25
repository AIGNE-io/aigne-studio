import { PROMPTS_FOLDER_NAME, useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputChildren, isAssistant } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, Typography } from '@mui/material';
import { WritableDraft } from 'immer';

import { SelectTool } from '../input/InputTable';

export default function ChildrenSettings({
  assistant,
  output,
  projectId,
  gitRef,
}: {
  assistant: AssistantYjs;
  output: OutputVariableYjs;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();

  const { store } = useProjectStore(projectId, gitRef);

  const initialValue = output.initialValue as RuntimeOutputChildren | undefined;

  const doc = (getYjsValue(output) as Map<any>).doc!;
  const setField = (update: (draft: WritableDraft<RuntimeOutputChildren>) => void) => {
    doc.transact(() => {
      if (typeof output.initialValue !== 'object') output.initialValue = {};
      update(output.initialValue as RuntimeOutputChildren);
    });
  };

  const options = Object.entries(store.tree)
    .filter(([, filepath]) => filepath?.startsWith(`${PROMPTS_FOLDER_NAME}/`))
    .map(([id]) => store.files[id])
    .filter((i): i is AssistantYjs => !!i && isAssistant(i) && i.id !== assistant.id)
    .map((i) => ({ id: i.id, name: i.name }));

  const value = (initialValue?.agents ?? [])
    .map((i) => options.find((o) => o.id === i.id))
    .filter((i) => !!i)
    .map((item) => {
      return {
        id: item.id,
        name: item.name,
      };
    });

  return (
    <Box>
      <Typography variant="subtitle2">{t('children')}</Typography>
      <SelectTool
        multiple
        options={options}
        value={value}
        onChange={(v) => {
          setField((o) => {
            o.agents = v.map((i) => ({ id: i.id, name: i.name }));
          });
        }}
      />
    </Box>
  );
}
