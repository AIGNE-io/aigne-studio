import { Box, BoxProps, CircularProgress, Stack } from '@mui/material';
import { ComponentProps, useEffect } from 'react';

import AIFormView from './AIFormView';
import { AssistantIdentifier, useAssistantState, useExecutingState } from './state';

export interface AIFormProps {
  identifier: AssistantIdentifier;
  BoxProps?: BoxProps;
  SubmitProps?: ComponentProps<typeof AIFormView>['SubmitProps'];
}

export default function AIForm({ BoxProps, SubmitProps, identifier }: AIFormProps) {
  const {
    state: { loading, assistant, error },
    reload,
  } = useAssistantState(identifier);

  const {
    state: { loading: submitting },
    execute,
    cancel,
  } = useExecutingState(identifier);

  useEffect(() => {
    if (!assistant) reload();
  }, []);

  if (error) throw error;

  return (
    <Box
      {...BoxProps}
      sx={[{
        height: "100%"
      }, ...(Array.isArray(BoxProps.sx) ? BoxProps.sx : [BoxProps.sx])]}>
      {loading ? (
        <Stack
          sx={{
            height: "100%",
            alignItems: "center",
            justifyContent: "center"
          }}>
          <CircularProgress size={24} />
        </Stack>
      ) : assistant ? (
        <AIFormView
          SubmitProps={SubmitProps}
          assistant={assistant}
          submitting={submitting}
          onSubmit={(parameters) => execute({ parameters })}
          onCancel={cancel}
        />
      ) : null}
    </Box>
  );
}
