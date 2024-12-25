import api, { RunnableStreamParser } from '@aigne/runtime/client/api';
import { EventSourceParserStream } from '@aigne/runtime/client/utils/event-stream';
import { Button, Container, Input, InputAdornment, Stack, Typography } from '@mui/material';
import React, { useState } from 'react';
import { withQuery } from 'ufo';

import MarkdownRenderer from '../components/MarkdownRenderer';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<{ $text?: string }>();

  const run = async (e: React.FormEvent) => {
    e.preventDefault();

    const stream = (await api(withQuery('/api/search', { q: question, stream: true })))
      .body!.pipeThrough(new TextDecoderStream())
      .pipeThrough(new EventSourceParserStream())
      .pipeThrough(new RunnableStreamParser());

    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      setResult(value.delta);
    }
  };

  return (
    <Container>
      <Stack component="form" onSubmit={run}>
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          endAdornment={
            <InputAdornment position="end">
              <Button type="submit">Send</Button>
            </InputAdornment>
          }
        />
      </Stack>

      <Stack>
        <Typography variant="h5">Answer</Typography>
        <MarkdownRenderer>{typeof result?.$text === 'string' ? result.$text : ''}</MarkdownRenderer>
      </Stack>
    </Container>
  );
}
