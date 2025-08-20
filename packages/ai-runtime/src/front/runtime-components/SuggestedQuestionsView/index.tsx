import { Stack, Typography, TypographyProps } from '@mui/material';

import OutputFieldContainer from '../../components/OutputFieldContainer';
import { useCurrentAgent } from '../../contexts/CurrentAgent';
import { useCurrentMessage, useCurrentMessageOutput } from '../../contexts/CurrentMessage';
import { useSession } from '../../contexts/Session';

export type SuggestedQuestionsViewPropValue = Array<{ question: string }>;

export default function SuggestedQuestionsView({ onlyLastMessage = false }: { onlyLastMessage?: boolean }) {
  const { outputValue, output } = useCurrentMessageOutput<SuggestedQuestionsViewPropValue>();

  const { message } = useCurrentMessage({ optional: true }) ?? {};
  const { lastMessageId, runAgent } = useSession((s) => ({
    lastMessageId: s.messages?.at(0)?.id,
    runAgent: s.runAgent,
  }));
  const isLastMessage = !!message && message.id === lastMessageId;

  const { aid } = useCurrentAgent();

  if (!message || (!isLastMessage && onlyLastMessage) || !outputValue.length) return null;

  return (
    <OutputFieldContainer output={output}>
      <Stack
        sx={{
          gap: 1,
        }}>
        {outputValue.map((item) => (
          <MessageSuggestedQuestion
            key={item.question}
            onClick={() => {
              runAgent({ aid, inputs: { ...message.inputs, question: item.question } });
            }}>
            {item.question}
          </MessageSuggestedQuestion>
        ))}
      </Stack>
    </OutputFieldContainer>
  );
}

function MessageSuggestedQuestion({ ...props }: TypographyProps) {
  return (
    <Typography
      variant="subtitle2"
      {...props}
      sx={{
        display: 'inline-block',
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        py: 1,
        px: 2,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'grey.50',
        },
        ...props.sx,
      }}
    />
  );
}
