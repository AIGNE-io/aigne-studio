import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Typography } from '@mui/material';
import { GPTTokens } from 'gpt-tokens';
import { useDeferredValue, useMemo } from 'react';

import { AssistantYjs, isPromptFileYjs } from './yjs-state';

export function TokenUsage({ assistant }: { assistant: AssistantYjs }) {
  const { t } = useLocaleContext();

  const prompts = useDeferredValue(isPromptFileYjs(assistant) ? Object.values(assistant.prompts ?? {}) : []);

  const tokens = useMemo(() => {
    if (!isPromptFileYjs(assistant)) return undefined;

    const messages = prompts
      .filter(
        (i): i is typeof i & { data: { type: 'message'; data: { content: string } } } =>
          i?.data?.type === 'message' && !!i?.data?.data?.content
      )
      .map(({ data }) => ({
        role: data.data.role,
        content: data.data.content,
      }));

    return messages.length > 0
      ? new GPTTokens({
          model: (assistant.model || 'gpt-3.5-turbo') as any,
          messages,
        })
      : undefined;
  }, [assistant, prompts]);

  return <Typography variant="caption">{t('aboutTokens', { tokens: tokens?.usedTokens || 0 })}</Typography>;
}
