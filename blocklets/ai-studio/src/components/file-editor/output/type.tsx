import { OutputVariable, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { ReactNode } from 'react';

export const runtimeOutputVariables: { icon?: ReactNode; title: string; name: RuntimeOutputVariable }[] = [
  { icon: <Icon icon="tabler:photo" />, title: 'Background Image', name: '$page.background.image' },
  { icon: <Icon icon="tabler:paint" />, title: 'Background Color', name: '$page.background.color' },
  { icon: <Icon icon="tabler:forms" />, title: 'Input Action', name: '$input' },
];

const runtimeOutputVariableNames = new Map<string, { icon?: ReactNode; title: string }>(
  runtimeOutputVariables.map((i) => [i.name, i])
);

export const getRuntimeOutputVariable = (variable: OutputVariable | OutputVariableYjs) =>
  runtimeOutputVariableNames.get(variable.name!);
