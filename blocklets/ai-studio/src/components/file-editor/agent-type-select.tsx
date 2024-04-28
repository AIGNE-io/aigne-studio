import PopperMenu from '@app/components/menu/PopperMenu';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { defaultImageModel, defaultTextModel } from '@blocklet/ai-runtime/common';
import { AssistantYjs, RuntimeOutputVariable, arrayToYjs, outputVariableToYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import { Box, ListItemIcon, MenuItem, Typography } from '@mui/material';
import { sortBy } from 'lodash';
import { nanoid } from 'nanoid';

const agentTypes = [
  { type: 'agent', icon: <Icon icon="tabler:x" />, i18nKey: 'none' },
  { type: 'prompt', icon: <Icon icon="tabler:brain" />, i18nKey: 'llm' },
  { type: 'image', icon: <Icon icon="tabler:photo" />, i18nKey: 'imageGeneration' },
  { type: 'function', icon: <Icon icon="tabler:code" />, i18nKey: 'code' },
  { type: 'api', icon: <Icon icon="tabler:api" />, i18nKey: 'api' },
] as const;

export default function AgentTypeSelect({ assistant }: { assistant: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(assistant) as Map<any>).doc!;
  const current = agentTypes.find((i) => i.type === assistant.type);

  return (
    <PopperMenu
      BoxProps={{
        children: (
          <Box className="center" gap={0.5} sx={{ cursor: 'pointer' }}>
            <Typography variant="subtitle2" sx={{ m: 0 }}>
              {current ? t(current.i18nKey) : t('processing')}
            </Typography>
            <Box component={Icon} icon="tabler:switch-horizontal" sx={{ fontSize: 15, color: '#3B82F6' }} />
          </Box>
        ),
      }}>
      {agentTypes.map((node) => (
        <MenuItem
          key={node.type}
          selected={current?.type === node.type}
          onClick={() => {
            doc.transact(() => {
              assistant.type = node.type;
              assistant.outputVariables ??= {};

              const removeVariable = (name: RuntimeOutputVariable) => {
                const image = Object.values(assistant.outputVariables!).find(
                  (i) => (i.data.name as RuntimeOutputVariable) === name
                );
                if (image) delete assistant.outputVariables?.[image.data.id];
              };

              if (assistant.type === 'image') {
                assistant.model = defaultImageModel;
                const schema = { id: nanoid(), name: RuntimeOutputVariable.images };
                assistant.outputVariables = arrayToYjs([schema]);
              } else {
                removeVariable(RuntimeOutputVariable.images);
              }

              if (assistant.type === 'prompt') {
                assistant.model = defaultTextModel;
                if (!Object.values(assistant.outputVariables).some((i) => i.data.name === RuntimeOutputVariable.text)) {
                  const id = nanoid();
                  assistant.outputVariables[id] = {
                    index: -1,
                    data: outputVariableToYjs({ id, name: RuntimeOutputVariable.text }),
                  };
                }
              } else {
                removeVariable(RuntimeOutputVariable.text);
              }

              sortBy(Object.values(assistant.outputVariables), 'index').forEach((item, index) => (item.index = index));
            });
          }}>
          <ListItemIcon>{node.icon}</ListItemIcon>
          {t(node.i18nKey)}
        </MenuItem>
      ))}
    </PopperMenu>
  );
}
