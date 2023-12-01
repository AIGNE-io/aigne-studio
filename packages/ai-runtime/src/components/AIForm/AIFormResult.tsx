import { ErrorRounded } from '@mui/icons-material';
import { Alert, Box, BoxProps, styled } from '@mui/material';

import { TemplateIdentifier, useExecutingState } from './state';

export interface AIFormResultProps {
  identifier: TemplateIdentifier;
  BoxProps?: BoxProps;
}

export default function AIFormResult({ identifier, BoxProps }: AIFormResultProps) {
  const { state } = useExecutingState(identifier);

  return (
    <Box height="100%" {...BoxProps}>
      <Box whiteSpace="pre-wrap">
        {state.content}

        {state.loading && <WritingIndicator />}
      </Box>

      {state.error && (
        <Box>
          <Alert color="error" icon={<ErrorRounded />}>
            {state.error.message}
          </Alert>
        </Box>
      )}
    </Box>
  );
}

const WritingIndicator = styled('span')`
  &:after {
    content: '';
    display: inline-block;
    vertical-align: middle;
    height: 1.2em;
    margin-top: -0.2em;
    margin-left: 0.1em;
    border-right: 0.2em solid orange;
    border-radius: 10px;
    animation: blink-caret 0.75s step-end infinite;

    @keyframes blink-caret {
      from,
      to {
        border-color: transparent;
      }
      50% {
        border-color: ${({ theme }) => theme.palette.secondary.main};
      }
    }
  }
`;
