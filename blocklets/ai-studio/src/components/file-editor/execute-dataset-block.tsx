import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ExecuteBlock, ExecuteBlockYjs, Tool, isAssistant } from '@blocklet/ai-runtime/types';
import { getAllParameters } from '@blocklet/dataset-sdk/request/util';
import type { DatasetObject } from '@blocklet/dataset-sdk/types';
import getDatasetTextByI18n from '@blocklet/dataset-sdk/util/get-dataset-i18n-text';
import { InfoOutlined as MuiInfoOutlined } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Divider,
  Stack,
  StackProps,
  Tooltip,
  Typography,
} from '@mui/material';
import { GridExpandMoreIcon } from '@mui/x-data-grid';
import { sortBy } from 'lodash';
import { useMemo } from 'react';
import { useAssistantCompare } from 'src/pages/project/state';

import Dataset from '../../../api/src/store/models/dataset/dataset';
import { useProjectStore } from '../../pages/project/yjs-state';
import IndicatorTextField from '../awareness/indicator-text-field';
import PromptEditorField from './prompt-editor-field';

export default function ExecuteDatasetBlockForm({
  projectId,
  gitRef,
  assistant,
  value,
  readOnly,
  path,
  compareAssistant,
  isRemoteCompare,
  openApis,
  ...props
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  value: ExecuteBlockYjs;
  path: (string | number)[];
  readOnly?: boolean;
  compareAssistant?: AssistantYjs;
  isRemoteCompare?: boolean;
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
} & StackProps) {
  const { t } = useLocaleContext();

  const { getDiffBackground } = useAssistantCompare({
    value: assistant,
    compareValue: compareAssistant,
    readOnly,
    isRemoteCompare,
  });

  const tools = value.tools && sortBy(Object.values(value.tools), (i) => i.index);

  return (
    <Stack {...props} sx={{ border: 2, borderRadius: 1, p: 1, gap: 1, ...props.sx }}>
      <Box display="flex" alignItems="center">
        <Tooltip
          title={t('executeBlockNameTip', { exampleVariable: '{exampleVariable}' })}
          placement="top"
          disableInteractive>
          <MuiInfoOutlined fontSize="small" sx={{ mr: 0.5, color: 'grey.500' }} />
        </Tooltip>
        <IndicatorTextField
          projectId={projectId}
          gitRef={gitRef}
          path={[value.id, value.variable ?? '']}
          TextFiledProps={{
            hiddenLabel: true,
            size: 'small',
            inputProps: {
              maxLength: 15,
            },
            InputProps: {
              placeholder: t('executeBlockName'),
              readOnly,
              sx: {
                backgroundColor: { ...getDiffBackground('prepareExecutes', `${value.id}.data.variable`) },
              },
            },
            value: value.variable ?? '',
            onChange: (e) => (value.variable = e.target.value),
          }}
        />
      </Box>

      <Divider />

      <Accordion
        sx={{
          '&::before': {
            display: 'none',
          },
        }}
        square
        disableGutters
        elevation={0}>
        <AccordionSummary
          sx={{
            px: 1,
            minHeight: 28,
            '& .MuiAccordionSummary-content': {
              my: 0,
            },
          }}
          expandIcon={<GridExpandMoreIcon />}>
          <Typography variant="subtitle2">{t('outputSettings')}</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0, mt: 0.5, px: 1, gap: 0.5, display: 'flex', flexDirection: 'column' }}>
          {value.role !== 'none' && value.formatResultType !== 'asHistory' && (
            <>
              {assistant.type === 'prompt' && (
                <Box display="flex" alignItems="baseline" justifyContent="space-between">
                  <Box display="flex">
                    <Typography sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>{t('outputPrefix')}</Typography>
                    <Tooltip title={t('outputPrefixTip')} placement="top" disableInteractive>
                      <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
                    </Tooltip>
                  </Box>
                  <Box width="60%">
                    <PromptEditorField
                      readOnly={readOnly}
                      projectId={projectId}
                      gitRef={gitRef}
                      ContentProps={{
                        sx: {
                          px: 1,
                          py: 0.5,
                        },
                      }}
                      placeholder="Your output prefix"
                      path={[value.id, 'prefix']}
                      assistant={assistant}
                      value={value.prefix}
                      onChange={(prefix) => (value.prefix = prefix)}
                    />
                  </Box>
                </Box>
              )}
              {assistant.type === 'prompt' && (
                <Box display="flex" alignItems="baseline" justifyContent="space-between">
                  <Box display="flex">
                    <Typography sx={{ whiteSpace: 'nowrap', mr: 0.5 }}>{t('outputSuffix')}</Typography>
                    <Tooltip title={t('outputSuffixTip')} placement="top" disableInteractive>
                      <MuiInfoOutlined fontSize="small" sx={{ color: 'grey.500' }} />
                    </Tooltip>
                  </Box>
                  <Box width="60%">
                    <PromptEditorField
                      readOnly={readOnly}
                      projectId={projectId}
                      gitRef={gitRef}
                      ContentProps={{
                        sx: {
                          px: 1,
                          py: 0.5,
                        },
                      }}
                      placeholder="Your output suffix"
                      path={[value.id, 'suffix']}
                      assistant={assistant}
                      value={value.suffix}
                      onChange={(suffix) => (value.suffix = suffix)}
                    />
                  </Box>
                </Box>
              )}
            </>
          )}
        </AccordionDetails>
      </Accordion>

      <Divider />

      {tools?.map(({ data: tool }) => (
        <ToolItemView
          key={tool.id}
          assistant={assistant}
          getDiffBackground={getDiffBackground}
          projectId={projectId}
          projectRef={gitRef}
          tool={tool}
          executeBlock={value}
          readOnly={readOnly}
          openApis={openApis}
          datasets={[]}
          gitRef={gitRef}
        />
      ))}
    </Stack>
  );
}

function ToolItemView({
  getDiffBackground,
  projectId,
  projectRef,
  tool,
  gitRef,
  executeBlock,
  readOnly,
  openApis,
  datasets,
  assistant,
  ...props
}: {
  assistant: AssistantYjs;
  executeBlock: ExecuteBlockYjs;
  getDiffBackground: (path: any, id?: string | undefined, defaultValue?: string | undefined) => { [x: string]: string };
  projectId: string;
  projectRef: string;
  gitRef: string;
  tool: Tool;
  readOnly?: boolean;
  openApis: (DatasetObject & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
  datasets: (Dataset['dataValues'] & { from?: NonNullable<ExecuteBlock['tools']>[number]['from'] })[];
} & StackProps) {
  const { t, locale } = useLocaleContext();
  const { store } = useProjectStore(projectId, projectRef);

  const f = store.files[tool.id];
  const file = f && isAssistant(f) ? f : undefined;

  const dataset = datasets.find((x) => x.id === tool.id);
  const api = openApis.find((i) => i.id === tool.id);

  const target = file ?? dataset ?? api;

  const parameters = useMemo(() => {
    if (!target) {
      return [
        {
          name: 'message',
          in: 'query',
          description: 'The content to be retrieved',
          'x-description-zh': '需要检索的内容',
          required: true,
        },
      ];
    }

    return getAllParameters(target as DatasetObject);
  }, [target]);

  const assistantParameters = new Set([
    ...Object.values(assistant.parameters ?? {}).map((i) => i.data.key),
    ...(assistant.type === 'prompt'
      ? Object.values(assistant.prompts ?? {})
          .map((i) => (i.data.type === 'executeBlock' ? i.data.data.variable : undefined))
          .filter(Boolean)
      : []),
  ]);

  return (
    <>
      <Stack
        direction="row"
        {...props}
        sx={{
          minHeight: 32,
          gap: 1,
          alignItems: 'center',
          cursor: 'pointer',
          borderRadius: 1,
          backgroundColor: { ...getDiffBackground('prepareExecutes', `${executeBlock.id}.data.tools.${tool.id}`) },
        }}>
        <Typography noWrap px={1} variant="subtitle2">
          {t('datasetDesc')}
        </Typography>
      </Stack>

      <Stack>
        {(parameters || [])?.map((parameter: any) => {
          if (!parameter) return null;
          if (parameter.name === 'datasetId') return null;

          tool.parameters ??= {};
          const value = tool.parameters[parameter.name];

          return (
            <Stack key={parameter.name}>
              <Typography variant="caption" mx={1}>
                {getDatasetTextByI18n(parameter, 'description', locale) ||
                  getDatasetTextByI18n(parameter, 'name', locale)}
              </Typography>

              <PromptEditorField
                placeholder={assistantParameters.has(parameter.key) ? `{{ ${parameter.name} }}` : undefined}
                value={value || ''}
                projectId={projectId}
                gitRef={gitRef}
                assistant={assistant}
                path={[assistant.id, parameter.name]}
                onChange={(value) => {
                  if (tool.parameters) tool.parameters[parameter.name] = value;
                }}
              />
            </Stack>
          );
        })}
      </Stack>
    </>
  );
}
