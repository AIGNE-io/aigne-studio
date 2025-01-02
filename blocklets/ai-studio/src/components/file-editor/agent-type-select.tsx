import PopperMenu from '@app/components/menu/PopperMenu';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { defaultImageModel, defaultTextModel } from '@blocklet/ai-runtime/common';
import type { AssistantYjs } from '@blocklet/ai-runtime/types';
import { RuntimeOutputVariable, arrayToYjs, outputVariableToYjs } from '@blocklet/ai-runtime/types';
import type { Map } from '@blocklet/co-git/yjs';
import { getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import APIIcon from '@iconify-icons/tabler/api';
import CodeIcon from '@iconify-icons/tabler/code';
import BranchIcon from '@iconify-icons/tabler/git-branch';
import PhotoIcon from '@iconify-icons/tabler/photo';
import PlayIcon from '@iconify-icons/tabler/player-play';
import SparklesIcon from '@iconify-icons/tabler/sparkles';
import SwitchHorizontalIcon from '@iconify-icons/tabler/switch-horizontal';
import ZZZIcon from '@iconify-icons/tabler/zzz';
import { Box, ListItemIcon, MenuItem, Stack, Typography } from '@mui/material';
import { sortBy } from 'lodash';
import { nanoid } from 'nanoid';

import blenderIcon from '../../icons/blender.png?url';

export const agentTypes = [
  { type: 'agent', icon: <Icon icon={ZZZIcon} />, i18nKey: 'idle' },
  { type: 'prompt', icon: <Icon icon={SparklesIcon} />, i18nKey: 'largeLanguageModel' },
  { type: 'image', icon: <Icon icon={PhotoIcon} />, i18nKey: 'imageGeneration' },
  {
    type: 'imageBlender',
    icon: <Box component="img" alt="" src={blenderIcon} width={14} height={14} />,
    i18nKey: 'imageBlender',
  },
  { type: 'function', icon: <Icon icon={CodeIcon} />, i18nKey: 'logic' },
  { type: 'api', icon: <Icon icon={APIIcon} />, i18nKey: 'api' },
  { type: 'router', icon: <Icon icon={BranchIcon} />, i18nKey: 'router' },
  { type: 'callAgent', icon: <Icon icon={PlayIcon} />, i18nKey: 'callAgent' },
] as const;

export const agentTypesMap = Object.fromEntries(agentTypes.map((i) => [i.type, i]));

export default function AgentTypeSelect({ assistant }: { assistant: AssistantYjs }) {
  const { t } = useLocaleContext();
  const doc = (getYjsValue(assistant) as Map<any>).doc!;
  const current = agentTypes.find((i) => i.type === assistant.type);

  return (
    <PopperMenu
      BoxProps={{
        component: Stack,
        overflow: 'hidden',
        sx: { flexDirection: 'row', alignItems: 'center', cursor: 'pointer', minWidth: 20 },
        children: (
          <>
            <Typography component="span" fontSize={15} fontWeight={500} width={1} noWrap>
              {current && t(current.i18nKey)}
            </Typography>
            <Box
              component={Icon}
              icon={SwitchHorizontalIcon}
              sx={{ fontSize: 15, color: '#3B82F6', verticalAlign: 'middle', ml: 0.5, flexShrink: 0 }}
            />
          </>
        ),
      }}
      PopperProps={{ placement: 'bottom-start' }}>
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

              if (assistant.type === 'image' || assistant.type === 'imageBlender') {
                if (assistant.type === 'image') assistant.model = defaultImageModel;
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

              if (assistant.type === 'router') {
                assistant.prompt = '{{question}}';
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
