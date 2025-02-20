import { useProjectStore } from '@app/pages/project/yjs-state';
import { useAgents } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { CallAssistantYjs } from '@blocklet/ai-runtime/types';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  MenuItem,
  Radio,
  Select,
  Stack,
  Table,
  TableCell,
  Typography,
} from '@mui/material';
import { sortBy } from 'lodash';
import { useEffect, useState } from 'react';

import { AgentName } from '../input/InputTable';
import { useCallAgentCustomOutputDialogState } from '../use-call-agent-output';
import VariableRow from './VariableRow';

interface SelectAgentOutputDialogProps {
  projectId: string;
  gitRef: string;
  open: boolean;
  onClose: () => void;
  assistant: CallAssistantYjs;
  onConfirm: (data: { id?: string; name?: string; agentInstanceId: string; outputVariableId?: string }) => void;
}

export function SelectAgentOutputDialog({
  projectId,
  gitRef,
  open,
  onClose,
  assistant,
  onConfirm,
}: SelectAgentOutputDialogProps) {
  const { t } = useLocaleContext();
  const { state, onReset } = useCallAgentCustomOutputDialogState(projectId, gitRef, assistant.id);
  const { getFileById } = useProjectStore(projectId, gitRef);

  const agents = assistant.agents && sortBy(Object.values(assistant.agents), (i) => i.index);

  const [agentInstanceId, setSelectedAgentId] = useState(agents?.[0]?.data.instanceId || agents?.[0]?.data.id || '');
  const [outputVariableId, setSelectedOutputs] = useState<string>('');

  useEffect(() => {
    if (state.output?.agentInstanceId) {
      setSelectedAgentId(state.output.agentInstanceId);
    }

    if (state.output?.outputVariableId) {
      setSelectedOutputs(state.output.outputVariableId);
    }
  }, [state.output?.agentInstanceId, state.output?.outputVariableId]);

  const currentAgent = agents?.find(
    (agent) => agent.data.instanceId === agentInstanceId || agent.data.id === agentInstanceId
  );

  const handleAgentChange = (event: any) => {
    setSelectedAgentId(event.target.value);
    setSelectedOutputs('');
  };

  const reset = () => {
    setSelectedAgentId(agents?.[0]?.data.instanceId || agents?.[0]?.data.id || '');
    setSelectedOutputs('');
    onReset();
  };

  const handleConfirm = () => {
    onConfirm({
      id: state.output?.id,
      name: state.name,
      agentInstanceId: agentInstanceId,
      outputVariableId: outputVariableId,
    });
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const agent = useAgents({ type: 'tool' }).agentMap[currentAgent?.data.id!];
  const outputs = agent?.outputVariables ?? [];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('selectCustomOutput')}</DialogTitle>

      <DialogContent>
        <FormControl fullWidth>
          <Select
            value={currentAgent?.data.instanceId ?? currentAgent?.data.id}
            onChange={handleAgentChange}
            label={t('selectCustomOutput')}>
            {agents?.map((agent) => (
              <MenuItem
                key={`${agent.data.instanceId}-${agent.data.id}`}
                value={agent.data.instanceId ?? agent.data.id}>
                <AgentName
                  type="tool"
                  blockletDid={agent.data.blockletDid}
                  agentId={agent.data.id}
                  projectId={agent.data.projectId}
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box mt={2}>
          <Typography variant="subtitle5" mb={0.5}>
            {t('selectCustomOutputTip')}
          </Typography>
          <Table sx={{ td: { p: '4px !important' } }}>
            {agent && (
              <Box component="tbody">
                {outputs.map((output) => {
                  return (
                    <Stack key={output.id} direction="row" alignItems="center" gap={1}>
                      <Box>
                        <Radio
                          id={`output-${output.id}`}
                          checked={outputVariableId.includes(output.id)}
                          onChange={() => setSelectedOutputs(output.id)}
                        />
                      </Box>

                      <Box flex={1} component="label" htmlFor={`output-${output.id}`}>
                        {output.name || output.id}
                      </Box>
                    </Stack>
                  );
                })}
              </Box>
            )}
          </Table>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('cancel')}</Button>
        <Button onClick={handleConfirm} variant="contained">
          {t('confirm')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
