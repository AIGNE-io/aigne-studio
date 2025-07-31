import { Box, BoxProps, Stack } from '@mui/material';
import React, { ComponentProps, ReactElement, ReactNode, Suspense } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function ({
  sx,
  className,
  content = undefined,
  ...props
}: { content?: string } & Pick<BoxProps, 'sx' | 'className'> & ComponentProps<typeof Markdown>) {
  return (
    <Box
      className={className}
      sx={{
        ...sx,
        pre: {
          bgcolor: 'grey.100',
          color: 'inherit',
          borderRadius: 1,
        },
      }}>
      <Markdown
        {...props}
        remarkPlugins={[remarkGfm]}
        components={{
          pre: MarkdownPre,
          table: ({ className: cls, children }) => {
            return (
              <Box sx={{ overflow: 'auto', my: 1 }}>
                <table className={cls}>{children}</table>
              </Box>
            );
          },
        }}>
        {props.children || content}
      </Markdown>
    </Box>
  );
}

const ReactSyntaxHighlighter = React.lazy(() => import('react-syntax-highlighter').then((m) => ({ default: m.Prism })));

function MarkdownPre({ children = undefined, ...props }: { children?: ReactNode }) {
  const childrenProps = (children as ReactElement<any>)?.props;

  if (!childrenProps?.children) return null;

  const match = /language-(\w+)/.exec(childrenProps.className || '');
  const language = match?.[1];

  return (
    <Box
      component="div"
      sx={{
        fontSize: 14,
        borderRadius: 1,
        bgcolor: 'rgb(245, 242, 240)',
        '> pre': { mt: '0 !important' },
      }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          p: 0.5,
          pl: 1.5,
          borderBottom: 1,
          borderColor: 'grey.200',
        }}>
        <Box>{language}</Box>

        <Box
          sx={{
            flex: 1,
          }}
        />
      </Stack>
      <Suspense>
        <Box
          component={ReactSyntaxHighlighter}
          language={match?.[1]}
          {...props}
          sx={{ borderRadius: 1, bgcolor: 'red' }}>
          {String(childrenProps.children).replace(/\n$/, '')}
        </Box>
      </Suspense>
    </Box>
  );
}
