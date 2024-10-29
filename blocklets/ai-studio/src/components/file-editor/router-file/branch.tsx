import 'react-querybuilder/dist/query-builder.scss';

import { RouterAssistantYjs } from '@blocklet/ai-runtime/types';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { Box, Button, IconButton, Stack, Typography, styled } from '@mui/material';
import { QueryBuilderMaterial } from '@react-querybuilder/material';
import { cloneDeep, sortBy } from 'lodash';
import { useMemo } from 'react';
import type { RuleGroupType } from 'react-querybuilder';
import { QueryBuilder } from 'react-querybuilder';

import PromptEditorField from '../prompt-editor-field';

const initialQuery: RuleGroupType = { combinator: 'and', rules: [] };

export default function RouterAssistantBranchEditor({
  projectId,
  gitRef,
  value,
  compareValue,
  disabled,
  isRemoteCompare,
}: {
  projectId: string;
  gitRef: string;
  value: RouterAssistantYjs;
  compareValue?: RouterAssistantYjs;
  disabled?: boolean;
  isRemoteCompare?: boolean;
}) {
  const parameters = useMemo(() => {
    return Object.values(value.parameters || {})
      .map((i) => i.data)
      .filter((x) => x.key);
  }, [value.parameters]);

  const fields = useMemo(() => {
    return parameters.map((i) => ({
      name: i.key!,
      label: i.label || i.key!,
    }));
  }, [parameters]);

  const routes = value.routes && sortBy(Object.values(value.routes), (i) => i.index);

  console.log(JSON.stringify(routes, null, 2));

  return (
    <Container gap={1.5}>
      <QueryBuilderMaterial>
        {(routes || []).map(({ data: item, index }) => {
          return (
            <QueryBuilder
              key={index}
              fields={fields}
              query={cloneDeep(item.condition ?? initialQuery)}
              onQueryChange={(newQuery) => {
                item.condition = newQuery as any;
              }}
              controlElements={{
                addGroupAction: () => null,
                removeGroupAction: () => null,
                cloneGroupAction: () => null,
              }}
            />
          );
        })}
      </QueryBuilderMaterial>

      <Button>Add Branch</Button>
    </Container>
  );
}

interface BranchItemProps {
  hasCondition?: boolean;
  index: number;
  onDelete?: () => void;
}

export function BranchItem({ hasCondition = false, index, onDelete }: BranchItemProps) {
  return (
    <Box sx={{ mb: 1 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            width: 35,
            fontSize: '0.75rem',
          }}>
          {hasCondition ? 'IF' : 'ELIF'}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            fontSize: '0.75rem',
          }}>
          CASE {index}
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} alignItems="center">
        {hasCondition ? (
          <Box
            sx={{
              flex: 1,
              p: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
            }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography>sys.user_id</Typography>
              <Typography>22</Typography>
            </Stack>
          </Box>
        ) : (
          <Button variant="outlined" size="small" startIcon={<span>+</span>} sx={{ fontSize: '0.875rem' }}>
            添加条件
          </Button>
        )}

        <IconButton size="small" onClick={onDelete}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

const StyledPromptEditor = styled(PromptEditorField)(({ theme }) =>
  theme.unstable_sx({
    p: 0,
    '.ContentEditable__root': {
      p: 1,
      px: 1.5,
      minHeight: 40,
      ...theme.typography.body1,
      bgcolor: '#fff',

      ':hover': {
        bgcolor: '#fff',
      },

      ':focus': {
        bgcolor: '#fff',
      },
    },

    '.Placeholder__root': {
      top: '8px',
      left: '12px',
      bottom: 'inherit',
      fontSize: '14px',
      lineHeight: '24px',
    },
  })
);

const Container = styled(Stack)`
  .svg-font-color svg > path {
    fill: var(--ifm-font-color-base);
  }

  .queryBuilder {
    min-width: 420px;
  }

  .validateQuery .queryBuilder .ruleGroup.queryBuilder-invalid {
    background-color: rgba(102, 51, 153, 0.4);
  }
  .validateQuery .queryBuilder .ruleGroup.queryBuilder-invalid .ruleGroup-addRule {
    font-weight: bold !important;
  }
  .validateQuery .queryBuilder .ruleGroup.queryBuilder-invalid > .ruleGroup-header::after {
    content: 'Empty groups are considered invalid. Avoid them by using addRuleToNewGroups.';
    color: white;
  }
  .validateQuery .queryBuilder .rule.queryBuilder-invalid .rule-value {
    background-color: rgba(102, 51, 153, 0.4);
  }
  .validateQuery .queryBuilder .rule.queryBuilder-invalid .rule-value::placeholder {
    color: rgb(71.4, 35.7, 107.1);
  }

  html[data-theme='dark'] .validateQuery .queryBuilder .rule.queryBuilder-invalid .rule-value::placeholder {
    color: rgb(147.9, 94.35, 201.45);
  }

  .justifiedLayout .queryBuilder .ruleGroup-addGroup + button.ruleGroup-cloneGroup,
  .justifiedLayout .queryBuilder .ruleGroup-addGroup + button.ruleGroup-lock,
  .justifiedLayout .queryBuilder .ruleGroup-addGroup + button.ruleGroup-remove {
    margin-left: auto !important;
  }
  .justifiedLayout .queryBuilder .rule-operators + button.rule-cloneRule,
  .justifiedLayout .queryBuilder .rule-operators + button.rule-lock,
  .justifiedLayout .queryBuilder .rule-operators + button.rule-remove,
  .justifiedLayout .queryBuilder .rule-value + button.rule-cloneRule,
  .justifiedLayout .queryBuilder .rule-value + button.rule-lock,
  .justifiedLayout .queryBuilder .rule-value + button.rule-remove,
  .justifiedLayout .queryBuilder .control + button.rule-cloneRule,
  .justifiedLayout .queryBuilder .control + button.rule-lock,
  .justifiedLayout .queryBuilder .control + button.rule-remove,
  .justifiedLayout .queryBuilder .chakra-select__wrapper + button.rule-cloneRule,
  .justifiedLayout .queryBuilder .chakra-select__wrapper + button.rule-lock,
  .justifiedLayout .queryBuilder .chakra-select__wrapper + button.rule-remove {
    margin-left: auto !important;
  }
`;
