import PopperMenu from '@app/components/menu/PopperMenu';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, OutputVariableYjs, variableBlockListForAgent } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import CheckIcon from '@iconify-icons/tabler/check';
import BranchIcon from '@iconify-icons/tabler/git-branch';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Box, Divider, ListItemIcon, MenuItem } from '@mui/material';
import { sortBy } from 'lodash';

import useCallAgentOutput from '../use-call-agent-output';
import { runtimeOutputVariables } from './type';

const ActionRefOutput = ({
  onSelect,
  onDeleteSelect,
  assistant,
  projectId,
  gitRef,
}: {
  onSelect?: (value: Partial<Omit<OutputVariableYjs, 'id'>>) => void;
  onDeleteSelect?: (value: { id: string }) => void;
  assistant: AssistantYjs;
  projectId: string;
  gitRef: string;
}) => {
  const { t } = useLocaleContext();
  const { outputs, outputsExist, getRefOutputId, getOutputI18nName } = useCallAgentOutput({
    projectId,
    gitRef,
    assistant,
  });

  if (!outputs?.length) return null;

  return (
    <>
      <Divider textAlign="left" sx={{ my: '4px !important', p: 0, fontSize: 13, color: 'text.secondary' }}>
        {`${t('ref')}${t('outputs')}`}
      </Divider>

      {outputs.map((output) => (
        <MenuItem
          key={output.id}
          selected={outputsExist.has(output.id)}
          onClick={(e) => {
            e.stopPropagation();

            if (outputsExist.has(output.id)) {
              onDeleteSelect?.({ id: getRefOutputId(output.id) || '' });
            } else {
              onSelect?.({ name: '', from: { type: 'output', id: output.id } });
            }
          }}>
          <ListItemIcon>
            <Icon icon={BranchIcon} />
          </ListItemIcon>
          <Box flex={1}>{getOutputI18nName(output.name || '')}</Box>
          <Box sx={{ width: 40, textAlign: 'right' }}>
            {outputsExist.has(output.id) && <Box component={Icon} icon={CheckIcon} />}
          </Box>
        </MenuItem>
      ))}
    </>
  );
};

export default function AddOutputVariableButton({
  allSelectAgentOutputs,
  assistant,
  onSelect,
  onDeleteSelect,
  onSelectAll,
  projectId,
  gitRef,
}: {
  allSelectAgentOutputs?: NonNullable<AssistantYjs['outputVariables']>[string]['data'][];
  assistant: AssistantYjs;
  onSelect?: (value: Partial<Omit<OutputVariableYjs, 'id'>>) => void;
  onDeleteSelect?: (value: { id: string }) => void;
  onSelectAll?: (list: NonNullable<AssistantYjs['outputVariables']>[string]['data'][]) => void;
  projectId: string;
  gitRef: string;
}) {
  const { t } = useLocaleContext();

  const exists = new Set(Object.values(assistant.outputVariables ?? {}).map((i) => i.data.name));

  const inputs =
    assistant.parameters &&
    sortBy(Object.values(assistant.parameters), 'index')
      .map((i) => i.data)
      .filter((i): i is typeof i & Required<Pick<typeof i, 'key'>> => !!i.key);

  const disabled = assistant.type === 'parallelCallAgent';

  return (
    <PopperMenu
      ButtonProps={{
        sx: { mt: 1 },
        startIcon: <Box fontSize={16} component={Icon} icon={PlusIcon} />,
        children: <Box>{t('output')}</Box>,
      }}
      PopperProps={{ placement: 'bottom-start' }}>
      {runtimeOutputVariables.flatMap((group) => [
        <Divider
          key={`group-${group.group}`}
          textAlign="left"
          sx={{ my: '4px !important', p: 0, fontSize: 13, color: 'text.secondary' }}>
          {t(group.group)}
        </Divider>,

        ...group.outputs.map((variable) => {
          const blockList = variableBlockListForAgent[assistant.type];
          if (blockList?.allow && !blockList.allow.has(variable.name)) return null;
          if (blockList?.block && blockList.block.has(variable.name)) return null;

          return (
            <MenuItem
              disabled={disabled && group.group === 'system'}
              key={variable.name}
              selected={exists.has(variable.name)}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.({ name: variable.name });
              }}>
              <ListItemIcon>{variable.icon}</ListItemIcon>
              <Box flex={1}>{t(variable.i18nKey)}</Box>
              <Box sx={{ width: 40, textAlign: 'right' }}>
                {exists.has(variable.name) && <Box component={Icon} icon={CheckIcon} />}
              </Box>
            </MenuItem>
          );
        }),
      ])}

      {!!allSelectAgentOutputs?.length && (
        <>
          <Divider sx={{ my: '4px !important', p: 0 }} />
          <MenuItem onClick={() => onSelectAll?.(allSelectAgentOutputs)} disabled={disabled}>
            <ListItemIcon>
              <Icon icon={BranchIcon} />
            </ListItemIcon>
            {t('selectAgentOutput')}
          </MenuItem>
        </>
      )}

      {!!inputs?.length && (
        <>
          <Divider textAlign="left" sx={{ my: '4px !important', p: 0, fontSize: 13, color: 'text.secondary' }}>
            {t('inputs')}
          </Divider>

          {inputs.map((input) => (
            <MenuItem
              disabled={disabled}
              key={input.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.({ name: '', from: { type: 'input', id: input.id } });
              }}>
              <ListItemIcon>
                <Icon icon={BranchIcon} />
              </ListItemIcon>
              {input.key}
            </MenuItem>
          ))}
        </>
      )}

      <ActionRefOutput
        projectId={projectId}
        gitRef={gitRef}
        assistant={assistant}
        onDeleteSelect={onDeleteSelect}
        onSelect={onSelect}
      />

      <Divider sx={{ my: '4px !important', p: 0 }} />

      <MenuItem onClick={() => onSelect?.({ name: '' })} disabled={disabled}>
        <ListItemIcon>
          <Icon icon={PlusIcon} />
        </ListItemIcon>
        {t('customOutput')}
      </MenuItem>
    </PopperMenu>
  );
}
