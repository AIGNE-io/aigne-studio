import chatbot from '@aigne-project/chatbot/client';
import { OrderedRecord } from '@aigne/core';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Container,
  Input,
  InputAdornment,
  Stack,
  Typography,
} from '@mui/material';
import { produce } from 'immer';
import { nanoid } from 'nanoid';
import React, { memo, useState } from 'react';

import MarkdownRenderer from '../components/MarkdownRenderer';

interface MessageItem {
  id: string;
  question?: string;
  $text?: string;
  usedMemory?: string;
  allMemory?: string;
  loading?: boolean;
}

export default function Home() {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<OrderedRecord<MessageItem>>(() => OrderedRecord.fromArray([]));

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestion('');

    const message: MessageItem = {
      id: nanoid(),
      question,
      loading: true,
    };

    setMessages((prev) => produce(prev, (draft) => OrderedRecord.push(draft, message)));

    try {
      const stream = await (await chatbot.resolve('chat')).run({ question }, { stream: true });

      const reader = stream.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        setMessages((prev) =>
          produce(prev, (draft) => {
            const m = draft[message.id]!;
            Object.assign(m, value.delta);
          }),
        );
      }
    } finally {
      setMessages((prev) =>
        produce(prev, (draft) => {
          const m = draft[message.id]!;
          m.loading = false;
        }),
      );
    }
  };

  return (
    <Container>
      <Typography variant="h4" textAlign="center" my={6}>
        Team Assistant
      </Typography>
      <Typography textAlign="center" my={6}>
        This is a simple chatbot that can help you query documents and answer questions. Try asking it a question!
      </Typography>

      <Stack minHeight="50vh" gap={2}>
        {OrderedRecord.map(messages, (message) => (
          <MessageView key={message.id} message={message} />
        ))}
      </Stack>

      <Stack component="form" onSubmit={run} position="sticky" bottom={0} py={2} bgcolor="white">
        <Input
          fullWidth
          disableUnderline
          sx={{ border: 1, borderColor: 'divider', py: 1, pl: 2, borderRadius: 10 }}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          endAdornment={
            <InputAdornment position="end">
              <Button type="submit">➡️</Button>
            </InputAdornment>
          }
        />
      </Stack>
    </Container>
  );
}

const MessageView = memo(({ message }: { message: MessageItem }) => {
  return (
    <Stack gap={2}>
      <Stack direction="row" gap={2}>
        <Avatar>🧑</Avatar>

        <Stack flex={1} pt={1} gap={1}>
          <Typography>{message.question}</Typography>

          <Stack direction="row" gap={2}>
            <Box flex={1} sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }} maxHeight={200} overflow="auto">
              <Typography variant="subtitle2" position="sticky" top={0} bgcolor="grey.100">
                Related Memories
              </Typography>
              {message.loading && !message.usedMemory && <CircularProgress size={18} />}
              <Typography whiteSpace="pre-wrap" fontSize={14} color="text.secondary">
                {message.usedMemory}
              </Typography>
            </Box>
          </Stack>
        </Stack>
      </Stack>

      <Stack direction="row" gap={2}>
        <Avatar>🤖</Avatar>
        <Stack flex={1} pt={1} gap={1}>
          {message.loading && !message.$text && !message.allMemory && <CircularProgress size={18} />}

          <MarkdownRenderer>{message.$text}</MarkdownRenderer>

          {message.$text ? (
            <Box flex={1} sx={{ bgcolor: 'grey.100', p: 1, borderRadius: 1 }} maxHeight={200} overflow="auto">
              <Typography variant="subtitle2" position="sticky" top={0} bgcolor="grey.100">
                All Memories
              </Typography>
              {message.loading && !message.allMemory && <CircularProgress size={18} />}
              <Typography whiteSpace="pre-wrap" fontSize={14} color="text.secondary">
                {message.allMemory}
              </Typography>
            </Box>
          ) : null}
        </Stack>
      </Stack>
    </Stack>
  );
});
