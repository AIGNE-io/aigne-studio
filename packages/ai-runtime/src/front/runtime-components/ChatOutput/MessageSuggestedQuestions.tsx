import { Stack, Typography, TypographyProps } from '@mui/material';

import { RuntimeOutputVariable, RuntimeOutputVariablesSchema } from '../../../types';

export default function MessageSuggestedQuestions({
  dataSource,
  onClick = undefined,
}: {
  dataSource: RuntimeOutputVariablesSchema[RuntimeOutputVariable.suggestedQuestions];
  onClick?: (item: NonNullable<typeof dataSource>[number]) => void;
}) {
  const suggestedQuestions = dataSource;

  if (suggestedQuestions?.length) {
    return (
      <Stack
        sx={{
          gap: 1,
        }}>
        {suggestedQuestions.map((item) => {
          return (
            <MessageSuggestedQuestion key={item.question} onClick={() => onClick?.(item)}>
              {item.question}
            </MessageSuggestedQuestion>
          );
        })}
      </Stack>
    );
  }

  return null;
}

export function MessageSuggestedQuestion({ ...props }: TypographyProps) {
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
        // without logo width
        maxWidth: 'calc(100% - 20px)',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'grey.50',
        },
        ...props.sx,
      }}
    />
  );
}
