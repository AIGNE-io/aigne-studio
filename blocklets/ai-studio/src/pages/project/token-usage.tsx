import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Typography } from '@mui/material';
import { GPTTokens } from 'gpt-tokens';
import { useDeferredValue, useMemo } from 'react';

import { TemplateYjs } from '../../../api/src/store/projects';
import { PromptMessage, Role } from '../../../api/src/store/templates';
import { isPromptMessage } from './yjs-state';

export function TokenUsage({ template }: { template: TemplateYjs }) {
  const { t } = useLocaleContext();

  const prompts = useDeferredValue(Object.values(template.prompts ?? {}));

  const tokens = useMemo(() => {
    const messages = prompts
      .map(({ data }) => ({
        role: data.role,
        content: data.content,
      }))
      .filter((i): i is PromptMessage & { role: Role; content: string } => isPromptMessage(i) && Boolean(i.content));

    return messages.length > 0
      ? new GPTTokens({
          model: (template.model || 'gpt-3.5-turbo') as any,
          messages,
        })
      : undefined;
  }, [prompts]);

  return <Typography variant="caption">{t('aboutTokens', { tokens: tokens?.usedTokens || 0 })}</Typography>;
}
