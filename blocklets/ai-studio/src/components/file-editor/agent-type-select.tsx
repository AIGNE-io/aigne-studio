import PopperMenu from '@app/components/menu/PopperMenu';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, RuntimeOutputVariable, arrayToYjs, outputVariableToYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import { ButtonProps, ListItemIcon, MenuItem } from '@mui/material';
import { sortBy } from 'lodash';
import { nanoid } from 'nanoid';

const agentTypes = [
  { type: 'agent', icon: <Icon icon="tabler:x" />, i18nKey: 'none' },
  { type: 'prompt', icon: <Icon icon="tabler:file-description" />, i18nKey: 'prompt' },
  { type: 'image', icon: <Icon icon="tabler:photo" />, i18nKey: 'image' },
  { type: 'function', icon: <Icon icon="tabler:code" />, i18nKey: 'function' },
  { type: 'api', icon: <Icon icon="tabler:link" />, i18nKey: 'api' },
] as const;

export default function AgentTypeSelect({
  assistant,
  ...props
}: {
  assistant: AssistantYjs;
} & Omit<ButtonProps, 'onSelect'>) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(assistant) as Map<any>).doc!;

  const current = agentTypes.find((i) => i.type === assistant.type);

  return (
    <PopperMenu
      ButtonProps={{
        startIcon: current?.icon,
        endIcon: <Icon icon="tabler:chevron-down" />,
        children: current ? t(current.i18nKey) : t('processing'),
        ...props,
        sx: { minWidth: 32, minHeight: 32, px: 2, py: 0, ...props.sx },
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
                const schema = { id: nanoid(), name: RuntimeOutputVariable.images };
                assistant.outputVariables = arrayToYjs([schema]);
              } else {
                removeVariable(RuntimeOutputVariable.images);
              }

              if (assistant.type === 'prompt') {
                if (
                  !Object.values(assistant.outputVariables).some(
                    (i) => i.data.name === RuntimeOutputVariable.textStream
                  )
                ) {
                  const id = nanoid();
                  assistant.outputVariables[id] = {
                    index: -1,
                    data: outputVariableToYjs({ id, name: RuntimeOutputVariable.textStream }),
                  };
                }
              } else {
                removeVariable(RuntimeOutputVariable.textStream);
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
