import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import type { AssistantYjs } from '@blocklet/ai-runtime/types';
import { isPromptAssistant } from '@blocklet/ai-runtime/types';
import { Typography } from '@mui/material';
import { GPTTokens } from 'gpt-tokens';
import { useDeferredValue, useMemo } from 'react';

function TokenUsage({ assistant }: { assistant: AssistantYjs }) {
  const { t } = useLocaleContext();

  const prompts = useDeferredValue(isPromptAssistant(assistant) ? Object.values(assistant.prompts ?? {}) : []);

  const tokens = useMemo(() => {
    if (!isPromptAssistant(assistant)) return undefined;

    const messages = prompts
      .filter(
        (i): i is typeof i & { data: { type: 'message'; data: { content: string } } } =>
          i.data?.type === 'message' && !!i.data.data?.content
      )
      .map(({ data }) => ({
        role: data.data.role,
        content: data.data.content,
      }));

    return messages.length > 0
      ? new GPTTokens({
          model: 'gpt-3.5-turbo',
          messages,
        })
      : undefined;
  }, [assistant, prompts]);

  const tokenNumber = tokens?.usedTokens || 0;
  return (
    <Typography variant="subtitle3">{`${t('aboutTokens', { tokens: tokenNumber })} ${tokenNumber > 0 ? 'Tokens' : 'Token'}`}</Typography>
  );
}

export default TokenUsage;
