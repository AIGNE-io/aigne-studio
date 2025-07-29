import { ImagePreviewB64 } from '@app/pages/project/debug-view';
import { ImageType, MessageInput, SessionItem } from '@app/pages/project/state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ChatCompletionInput } from '@blocklet/aigne-hub/api/types/chat';
import { RunAssistantInput, RunAssistantLog, RunAssistantUsage } from '@blocklet/ai-runtime/types';
import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography, styled } from '@mui/material';
import { GridExpandMoreIcon } from '@mui/x-data-grid';
import dayjs from 'dayjs';
import { pick } from 'lodash';
import { memo } from 'react';

import { JsonDisplay, Label, LineContainer, PromptMessagesComponent, StrValue } from './base-trace';

type Trace =
  | { label: 'startTime' | 'endTime'; value: number }
  | { label: 'logs'; value: RunAssistantLog[] }
  | { label: 'inputParameters'; value: { [key: string]: string } }
  | { label: 'promptMessages'; value: ChatCompletionInput['messages'] }
  | { label: 'output'; value: string }
  | { label: 'images'; value: ImageType }
  | { label: 'apiArgs'; value: any }
  | { label: 'fnArgs'; value: any }
  | { label: 'stop'; value: boolean }
  | { label: 'modelParameters'; value: RunAssistantInput['modelParameters'] }
  | { label: 'usage'; value: RunAssistantUsage['usage'] };

function isTraceLabel(key: string): key is Trace['label'] {
  return [
    'startTime',
    'endTime',
    'logs',
    'output',
    'inputParameters',
    'promptMessages',
    'images',
    'apiArgs',
    'fnArgs',
    'stop',
    'modelParameters',
    'usage',
  ].includes(key);
}

const LabelValue = memo(({ label, value }: Trace) => {
  const { t } = useLocaleContext();
  if (label === 'startTime' || label === 'endTime') {
    return (
      <LineContainer>
        <Label variant="body1">{t(label)}:</Label>
        <StrValue variant="body1">{dayjs(value).format('HH:mm:ss:SSS')}</StrValue>
      </LineContainer>
    );
  }

  if (label === 'logs' && !!value.length) {
    return (
      <>
        <Label variant="body1">{t(label)}:</Label>
        <JsonDisplay>
          {value.map((item, index) => (
            <Box my={0.5} key={index}>
              <Typography component="span" color="text.secondary">
                {`${dayjs(item.timestamp).format('HH:mm:ss:SSS')}: `}
              </Typography>
              <Typography ml={0.25} color="text.secondary" component="span">{`${item.log}  `}</Typography>
            </Box>
          ))}
        </JsonDisplay>
      </>
    );
  }

  if (
    (label === 'inputParameters' || label === 'fnArgs' || label === 'apiArgs' || label === 'output') &&
    value &&
    Object.keys(value).length
  ) {
    let formatInputParameters;
    try {
      const result = typeof value === 'string' ? JSON.parse(value) : value;
      if (Array.isArray(result)) {
        formatInputParameters = result;
      } else if (typeof result === 'object') {
        formatInputParameters = Object.fromEntries(
          Object.entries(result).map(([key, value1]: any) => {
            try {
              return [key, JSON.parse(value1)];
            } catch {
              return [key, value1];
            }
          })
        );
      } else {
        formatInputParameters = value;
      }
    } catch {
      formatInputParameters = value;
    }

    return (
      <>
        <Label variant="body1">{t(label)}:</Label>
        <JsonDisplay>{JSON.stringify(formatInputParameters, null, 4)}</JsonDisplay>
      </>
    );
  }

  if (label === 'usage') {
    return (
      <>
        <Label variant="body1">{t(label)}:</Label>
        <Stack sx={{ pl: 1 }}>
          <Typography variant="caption">Prompt Tokens: {value.promptTokens}</Typography>
          <Typography variant="caption">Completion Tokens: {value.completionTokens}</Typography>
          <Typography variant="caption">Total Tokens: {value.totalTokens}</Typography>
        </Stack>
      </>
    );
  }

  if (label === 'promptMessages' && !!value?.length) {
    return (
      <>
        <Label variant="body1">{t(label)}:</Label>
        <PromptMessagesComponent value={value} />
      </>
    );
  }

  if (label === 'images' && value && value?.length > 0) {
    return (
      <>
        <Label variant="body1">{t(label)}:</Label>
        <ImagePreviewB64 itemWidth={100} spacing={1} dataSource={value} />
      </>
    );
  }

  if (label === 'modelParameters') {
    const modalParameters = Object.entries(value ?? {});
    return (
      <>
        {modalParameters.map(([label, value]) => (
          <LineContainer key={label}>
            <Label variant="body1">{t(label)}:</Label>
            <StrValue>{value}</StrValue>
          </LineContainer>
        ))}
      </>
    );
  }

  if (label === 'stop' && value) {
    return (
      <LineContainer>
        <StrValue sx={{ color: (theme) => theme.palette.warning.light }}>{t('stopped')}</StrValue>
      </LineContainer>
    );
  }

  return null;
});

const TraceCard = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  width: '100%',
}));

interface ContainerProps {
  deep?: number;
}

const Container = styled(Accordion)<ContainerProps>(({ theme, deep = 0 }) => ({
  margin: `0 0 0 ${theme.spacing(deep * 3)}`,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  '&::before': {
    display: 'none',
  },
  boxShadow: 'none',
}));

function BaseTrace({ deep, input }: { deep?: number; input: MessageInput }) {
  const pickInput = pick(
    input,
    'startTime',
    'endTime',
    'inputParameters',
    'promptMessages',
    'output',
    'logs',
    'images',
    'apiArgs',
    'fnArgs',
    'stop',
    'modelParameters',
    'usage'
  );
  const arr = Object.entries(pickInput).flatMap(([key, value]) => (isTraceLabel(key) ? [{ label: key, value }] : []));

  return (
    <Container disableGutters square defaultExpanded={false} deep={deep}>
      <AccordionSummary
        sx={{
          margin: 0,
          minHeight: 32,
          '& .MuiAccordionSummary-content': {
            my: 0,
          },
        }}
        expandIcon={<GridExpandMoreIcon />}>
        <Typography fontWeight="bold">{input.assistantName}</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <TraceCard>
          {arr.map((trace) => (
            <LabelValue key={trace.label} label={trace.label} value={trace.value} />
          ))}
        </TraceCard>
      </AccordionDetails>
    </Container>
  );
}

function BasicTree({ inputs }: { inputs?: SessionItem['messages'][number]['inputMessages'] }) {
  if (!Array.isArray(inputs)) return null;
  return (
    <Stack gap={1}>
      {inputs.map((item) => {
        return <BaseTrace key={item.taskId} input={item} deep={item.deep} />;
      })}
    </Stack>
  );
}

export default BasicTree;
