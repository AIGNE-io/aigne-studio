import { Box, BoxProps, CircularProgress, Stack } from '@mui/material';
import { ComponentProps, useEffect } from 'react';

import AIFormView from './AIFormView';
import { TemplateIdentifier, useExecutingState, useTemplateState } from './state';

export interface AIFormProps {
  identifier: TemplateIdentifier;
  BoxProps?: BoxProps;
  SubmitProps?: ComponentProps<typeof AIFormView>['SubmitProps'];
}

export default function AIForm({ BoxProps, SubmitProps, identifier }: AIFormProps) {
  const {
    state: { loading, template, error },
    reload,
  } = useTemplateState(identifier);

  const {
    state: { loading: submitting },
    execute,
    cancel,
  } = useExecutingState(identifier);

  useEffect(() => {
    if (!template) reload();
  }, []);

  if (error) throw error;

  return (
    <Box height="100%" {...BoxProps}>
      {loading ? (
        <Stack height="100%" alignItems="center" justifyContent="center">
          <CircularProgress size={24} />
        </Stack>
      ) : template ? (
        <AIFormView
          SubmitProps={SubmitProps}
          template={template}
          submitting={submitting}
          onSubmit={(parameters) => execute({ parameters })}
          onCancel={cancel}
        />
      ) : null}
    </Box>
  );
}
