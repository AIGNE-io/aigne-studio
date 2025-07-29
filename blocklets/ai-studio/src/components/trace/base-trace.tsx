import { ChatCompletionInput } from '@blocklet/aigne-hub/api/types/chat';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography, styled } from '@mui/material';
import { GridExpandMoreIcon } from '@mui/x-data-grid';
import { ReactNode } from 'react';

export const LineContainer = styled('div')(() => ({
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'baseline',
}));

export const Label = styled(Typography)(({ theme }) => ({
  whiteSpace: 'nowrap',
  marginRight: theme.spacing(1),
}));

export const StrValue = styled(Typography)(({ theme }) => ({
  color: theme.palette.text.secondary,
}));

export function JsonDisplay({ children }: { children: ReactNode }) {
  return (
    <Box mb={1} maxHeight={250} overflow="auto" bgcolor="grey.50" whiteSpace="pre-wrap" borderRadius={1} px={1}>
      {children}
    </Box>
  );
}

export function PromptMessagesComponent({ value }: { value: ChatCompletionInput['messages'] }) {
  return value?.map((i, index) => (
    <Accordion
      sx={{
        borderRadius: 1,
        border: (theme) => `1px solid ${theme.palette.divider}`,
        '&::before': {
          display: 'none',
        },
      }}
      disableGutters
      square
      elevation={0}
      key={index}>
      <AccordionSummary
        sx={{
          backgroundColor: (theme) =>
            theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, .05)' : 'rgba(0, 0, 0, .03)',
          minHeight: 28,
          '& .MuiAccordionSummary-content': {
            my: 0,
          },
        }}
        expandIcon={<GridExpandMoreIcon />}>
        <Typography>{i.role}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ fontSize: 18, py: 1 }}>
        <Typography sx={{ whiteSpace: 'pre-wrap' }}>
          {typeof i.content === 'string' ? i.content : JSON.stringify(i.content, null, 2)}
        </Typography>
      </AccordionDetails>
    </Accordion>
  ));
}
