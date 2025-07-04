import { ImagePreview } from '@blocklet/ai-kit/components';
import { ErrorRounded } from '@mui/icons-material';
import { Alert, Box, BoxProps, CircularProgress, Typography, styled } from '@mui/material';
import { ReactNode } from 'react';

import { AssistantIdentifier, useExecutingState } from './state';

export interface AIFormResultProps {
  identifier: AssistantIdentifier;
  placeholder?: ReactNode;
  loadingIndicator?: ReactNode;
  BoxProps?: BoxProps;
}

export default function AIFormResult({
  identifier,
  placeholder = (
    <Typography variant="caption" sx={{
      color: "text.disabled"
    }}>
      Let's try it
    </Typography>
  ),
  loadingIndicator = <CircularProgress size={32} />,
  BoxProps,
}: AIFormResultProps) {
  const { state } = useExecutingState(identifier);

  return (
    <Box
      {...BoxProps}
      sx={[{
        height: "100%"
      }, ...(Array.isArray(BoxProps.sx) ? BoxProps.sx : [BoxProps.sx])]}>
      {!state.content && !state.images?.length && !state.error && (
        <Box sx={{
          textAlign: "center"
        }}>{state.loading ? loadingIndicator : placeholder}</Box>
      )}
      {state.content && (
        <Box sx={{
          whiteSpace: "pre-wrap"
        }}>
          {state.content}

          {state.loading && <WritingIndicator />}
        </Box>
      )}
      {state.images && state.images.length > 0 && (
        <ImagePreview
          itemWidth={state.images.length === 1 ? undefined : 200}
          spacing={2}
          dataSource={state.images
            .map((item) => ({ src: item.url || (item.b64Json && `data:image/png;base64,${item.b64Json}`) }))
            .filter((i): i is { src: string } => !!i.src)}
        />
      )}
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
