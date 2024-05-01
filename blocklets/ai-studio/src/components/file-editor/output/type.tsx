import AigneLogo from '@app/icons/aigne-logo';
import AigneLogoOutput from '@app/icons/aigne-logo-output';
import { OutputVariable, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import { Box } from '@mui/material';
import { ReactNode } from 'react';

export const runtimeOutputVariables: {
  icon?: ReactNode;
  title: string;
  i18nKey: string;
  name: RuntimeOutputVariable;
}[] = [
  {
    icon: <Icon icon="tabler:forms" />,
    title: 'Stream Text Response',
    i18nKey: 'streamTextResponse',
    name: RuntimeOutputVariable.text,
  },
  {
    icon: <Icon icon="tabler:photo" />,
    title: 'Generated Images',
    i18nKey: 'generatedImages',
    name: RuntimeOutputVariable.images,
  },
  {
    icon: <Icon icon="tabler:message-question" />,
    title: 'Suggested Questions',
    i18nKey: 'suggestedQuestions',
    name: RuntimeOutputVariable.suggestedQuestions,
  },
  {
    icon: <Icon icon="tabler:link" />,
    title: 'Referenced Links',
    i18nKey: 'referencedLinks',
    name: RuntimeOutputVariable.referenceLinks,
  },
  {
    icon: <Icon icon="tabler:layout" />,
    title: 'Appearance Page',
    i18nKey: 'appearancePage',
    name: RuntimeOutputVariable.appearancePage,
  },
  {
    icon: <Icon icon="tabler:forms" />,
    title: 'Appearance Input',
    i18nKey: 'appearanceInput',
    name: RuntimeOutputVariable.appearanceInput,
  },
  {
    icon: <Box component={AigneLogoOutput} fontSize={14} />,
    title: 'Appearance Output',
    i18nKey: 'appearanceOutput',
    name: RuntimeOutputVariable.appearanceOutput,
  },
  {
    icon: <Box component={AigneLogo} fontSize={14} />,
    title: 'Children',
    i18nKey: 'children',
    name: RuntimeOutputVariable.children,
  },
];

const runtimeOutputVariableNames = new Map<string, (typeof runtimeOutputVariables)[number]>(
  runtimeOutputVariables.map((i) => [i.name, i])
);

export const getRuntimeOutputVariable = (variable: OutputVariable | OutputVariableYjs) =>
  runtimeOutputVariableNames.get(variable.name!);
