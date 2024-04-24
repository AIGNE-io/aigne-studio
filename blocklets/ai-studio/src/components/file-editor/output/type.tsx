import { OutputVariable, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { ReactNode } from 'react';

export const runtimeOutputVariables: {
  icon?: ReactNode;
  title: string;
  i18nKey: string;
  name: RuntimeOutputVariable;
}[] = [
  {
    icon: <Icon icon="tabler:cursor-text" />,
    title: 'Stream Text Response',
    i18nKey: 'streamTextResponse',
    name: '$textStream',
  },
  {
    icon: <Icon icon="tabler:photo" />,
    title: 'Generated Images',
    i18nKey: 'generatedImages',
    name: '$images',
  },
  {
    icon: <Icon icon="tabler:bulb" />,
    title: 'Suggested Questions',
    i18nKey: 'suggestedQuestions',
    name: '$suggested.questions',
  },
  {
    icon: <Icon icon="tabler:photo" />,
    title: 'Background Image',
    i18nKey: 'backgroundImage',
    name: '$page.background.image',
  },
  {
    icon: <Icon icon="tabler:paint" />,
    title: 'Background Color',
    i18nKey: 'backgroundColor',
    name: '$page.background.color',
  },
  { icon: <Icon icon="tabler:forms" />, title: 'Input Controller', i18nKey: 'inputController', name: '$input' },
];

const runtimeOutputVariableNames = new Map<string, (typeof runtimeOutputVariables)[number]>(
  runtimeOutputVariables.map((i) => [i.name, i])
);

export const getRuntimeOutputVariable = (variable: OutputVariable | OutputVariableYjs) =>
  runtimeOutputVariableNames.get(variable.name!);
