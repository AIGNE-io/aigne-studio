import AigneLogo from '@app/icons/aigne-logo';
import AigneLogoOutput from '@app/icons/aigne-logo-output';
import { OutputVariable, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import FormsIcon from '@iconify-icons/tabler/forms';
import LayoutIcon from '@iconify-icons/tabler/layout';
import LinkIcon from '@iconify-icons/tabler/link';
import MessageIcon from '@iconify-icons/tabler/message';
import MessageCircleQuestionIcon from '@iconify-icons/tabler/message-circle-question';
import MessageQuestionIcon from '@iconify-icons/tabler/message-question';
import PhotoIcon from '@iconify-icons/tabler/photo';
import ShareIcon from '@iconify-icons/tabler/share';
import WritingIcon from '@iconify-icons/tabler/writing';
import { Box } from '@mui/material';
import { ReactNode } from 'react';

export const runtimeOutputVariables: {
  group: 'system' | 'appearance';
  outputs: {
    icon?: ReactNode;
    title: string;
    i18nKey: string;
    name: RuntimeOutputVariable;
  }[];
}[] = [
  {
    group: 'system',
    outputs: [
      {
        icon: <Icon icon={WritingIcon} />,
        title: 'Stream Text Response',
        i18nKey: 'streamTextResponse',
        name: RuntimeOutputVariable.text,
      },
      {
        icon: <Icon icon={PhotoIcon} />,
        title: 'Generated Images',
        i18nKey: 'generatedImages',
        name: RuntimeOutputVariable.images,
      },
      {
        icon: <Icon icon={MessageQuestionIcon} />,
        title: 'Suggested Questions',
        i18nKey: 'suggestedQuestions',
        name: RuntimeOutputVariable.suggestedQuestions,
      },
      {
        icon: <Icon icon={LinkIcon} />,
        title: 'Referenced Links',
        i18nKey: 'referencedLinks',
        name: RuntimeOutputVariable.referenceLinks,
      },
      {
        icon: <Box component={AigneLogo} fontSize={14} />,
        title: 'Children',
        i18nKey: 'children',
        name: RuntimeOutputVariable.children,
      },
    ],
  },
  {
    group: 'appearance',
    outputs: [
      {
        icon: <Icon icon={LayoutIcon} />,
        title: 'Appearance Page',
        i18nKey: 'appearancePage',
        name: RuntimeOutputVariable.appearancePage,
      },
      {
        icon: <Icon icon={FormsIcon} />,
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
        icon: <Icon icon={ShareIcon} />,
        title: 'Share',
        i18nKey: 'share',
        name: RuntimeOutputVariable.share,
      },
      {
        icon: <Icon icon={MessageCircleQuestionIcon} />,
        title: 'Opening Questions',
        i18nKey: 'openingQuestions',
        name: RuntimeOutputVariable.openingQuestions,
      },
      {
        icon: <Icon icon={MessageIcon} />,
        title: 'Opening Message',
        i18nKey: 'openingMessage',
        name: RuntimeOutputVariable.openingMessage,
      },
    ],
  },
];

const runtimeOutputVariableNames = new Map<string, (typeof runtimeOutputVariables)[number]['outputs'][number]>(
  runtimeOutputVariables.flatMap((i) => i.outputs.map((j) => [j.name, j]))
);

export const getRuntimeOutputVariable = (variable: OutputVariable | OutputVariableYjs) =>
  runtimeOutputVariableNames.get(variable.name!);
