import { OutputVariable, OutputVariableYjs, RuntimeOutputVariable } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import LinkIcon from '@iconify-icons/tabler/link';
import MessageQuestionIcon from '@iconify-icons/tabler/message-question';
import MessagesIcon from '@iconify-icons/tabler/messages';
import PhotoIcon from '@iconify-icons/tabler/photo';
import WritingIcon from '@iconify-icons/tabler/writing';
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
        icon: <Icon icon={MessagesIcon} />,
        title: 'LLM Response Stream',
        i18nKey: 'llmResponseStream',
        name: RuntimeOutputVariable.llmResponseStream,
      },
    ],
  },
];

export const runtimeOutputVariableNames = new Map<string, (typeof runtimeOutputVariables)[number]['outputs'][number]>(
  runtimeOutputVariables.flatMap((i) => i.outputs.map((j) => [j.name, j]))
);

export const getRuntimeOutputVariable = (variable: OutputVariable | OutputVariableYjs) =>
  runtimeOutputVariableNames.get(variable.name!);

export const getOutputName = (inputName: string) => {
  for (let group of runtimeOutputVariables) {
    for (let output of group.outputs) {
      if (output.name === inputName) {
        return { isI18n: true, text: output.i18nKey };
      }
    }
  }

  return { isI18n: false, text: inputName };
};
