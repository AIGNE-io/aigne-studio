import AgentSelect from '@app/components/agent-select';
import PopperMenu from '@app/components/menu/PopperMenu';
import { useCurrentProject } from '@app/contexts/project';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useAgent } from '@app/store/agent';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { NumberField } from '@blocklet/ai-runtime/components';
import { AssistantYjs, OutputVariableYjs, RuntimeOutputVariable, VariableYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Icon } from '@iconify-icon/react';
import DotsIcon from '@iconify-icons/tabler/dots';
import PlusIcon from '@iconify-icons/tabler/plus';
import { Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import sortBy from 'lodash/sortBy';
import { bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { nanoid } from 'nanoid';
import { ComponentType, Ref, useEffect, useId, useImperativeHandle, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StoreApi, UseBoundStore, create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import { AuthorizeButton } from '../input/InputTable';
import PromptEditorField from '../prompt-editor-field';
import SelectVariable from '../select-variable';
import AppearanceComponentSettings from './AppearanceComponentSettings';
import ChildrenSettings from './ChildrenSettings';
import OpeningMessageSettings from './OpeningMessageSettings';
import OpeningQuestionsSettings from './OpeningQuestionsSettings';
import ProfileSettings from './ProfileSettings';
import ShareSettings from './ShareSettings';
import { getRuntimeOutputVariable, runtimeOutputVariableNames } from './type';

const fromType = ['input', 'output'];

export default function OutputActionsCell({
  depth,
  output,
  variable,
  projectId,
  gitRef,
  assistant,
  disabled,
  onRemove,
}: {
  depth: number;
  output: OutputVariableYjs;
  variable?: VariableYjs;
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  disabled?: boolean;
  onRemove?: () => void;
}) {
  const v = variable?.type ?? output;

  const runtimeVariable = getRuntimeOutputVariable(output);

  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();
  const variables = (variableYjs?.variables || []).filter((x) => x.type?.type === (output.type || 'string'));

  return (
    <Stack direction="row" gap={1} justifyContent="flex-end">
      {v.type === 'object' && (
        <Button
          sx={{ minWidth: 24, minHeight: 24, p: 0 }}
          disabled={Boolean(output.variable?.key)}
          onClick={() => {
            const doc = (getYjsValue(output) as Map<any>).doc!;
            doc.transact(() => {
              v.properties ??= {};
              const id = nanoid();
              v.properties[id] = {
                index: Object.values(v.properties).length,
                data: { id, type: 'string' },
              };
              sortBy(Object.values(v.properties), 'index').forEach((item, index) => (item.index = index));
            });
          }}>
          <Icon icon={PlusIcon} />
        </Button>
      )}

      <PopperButton
        depth={depth}
        assistant={assistant}
        isSaveAs={Boolean(depth === 0 && !runtimeVariable && !fromType.includes(output.from?.type || ''))}
        runtimeVariable={Boolean(runtimeVariable)}
        variables={variables}
        variable={variable}
        output={output}
        onDelete={onRemove}
        disabled={Boolean(disabled)}
      />
    </Stack>
  );
}

export interface PopperButtonProps {
  depth: number;
  assistant: AssistantYjs;
  variables: VariableYjs[];
  variable?: VariableYjs;
  isSaveAs: boolean;
  runtimeVariable: boolean;
  output: OutputVariableYjs;
  disabled: boolean;
  onDelete?: () => void;
  children?: any;
}

export interface PopperButtonImperative {
  open: () => void;
}

export interface OutputSettingsState {
  visible?: boolean;
  open: () => void;
  close: () => void;
}

const OutputSettingsCache: { [key: string]: UseBoundStore<StoreApi<OutputSettingsState>> } = {};

export const createOutputSettingsState = ({ agentId, outputId }: { agentId: string; outputId: string }) => {
  const key = `${agentId}-${outputId}`;
  OutputSettingsCache[key] ??= create(
    immer<OutputSettingsState>((set) => ({
      open: () =>
        set((state) => {
          state.visible = true;
        }),
      close: () =>
        set((state) => {
          state.visible = false;
        }),
    }))
  );

  return OutputSettingsCache[key]!;
};

const PopperButton = (
  {
    ref,
    depth,
    assistant,
    variables,
    variable,
    isSaveAs,
    runtimeVariable,
    output,
    disabled,
    onDelete,
    children
  }: PopperButtonProps & {
    ref: React.RefObject<PopperButtonImperative | null>;
  }
) => {
  const { t } = useLocaleContext();
  const dialogState = createOutputSettingsState({ agentId: assistant.id, outputId: output.id })();
  const parameterSettingPopperState = usePopupState({ variant: 'popper', popupId: useId() });

  useImperativeHandle(ref, () => ({ open: dialogState.open }), [dialogState.open]);
  const location = useLocation();

  const [currentSetting, setSetting] = useState<'setting' | 'save'>('setting');

  useEffect(() => {
    dialogState.close();
  }, [location.pathname]);

  const renderParameterSettings = (output: OutputVariableYjs) => {
    if (currentSetting === 'save') {
      return (
        <Box>
          <Typography variant="subtitle2" mb={0}>
            {t('memory.saveMemory')}
          </Typography>

          <Box>
            <SelectVariable
              placeholder={t('selectMemoryPlaceholder')}
              variables={variables}
              variable={variable}
              onDelete={() => {
                if (output.variable) delete output.variable;
              }}
              onChange={(_value) => {
                if (_value && output) {
                  output.variable = { key: _value.key, scope: _value.scope || '' };
                }
              }}
            />
          </Box>
        </Box>
      );
    }

    if (RuntimeOutputVariable.profile === output.name) {
      return <ProfileSettings output={output} />;
    }

    if (RuntimeOutputVariable.openingQuestions === output.name) {
      return <OpeningQuestionsSettings agent={assistant} output={output} />;
    }

    if (RuntimeOutputVariable.openingMessage === output.name) {
      return <OpeningMessageSettings output={output} />;
    }

    if (RuntimeOutputVariable.share === output.name) {
      return <ShareSettings output={output} />;
    }

    if (output.name === RuntimeOutputVariable.children) {
      return <ChildrenSettings agent={assistant} output={output} />;
    }

    if (currentSetting === 'setting') {
      return runtimeVariable ? null : output.type === 'string' ? (
        <Box>
          <Typography variant="subtitle2">{t('defaultValue')}</Typography>

          <TextField
            disabled={Boolean(disabled)}
            hiddenLabel
            fullWidth
            multiline
            placeholder={t('outputParameterDefaultValuePlaceholder')}
            value={output.defaultValue || ''}
            onChange={(e) => (output.defaultValue = e.target.value)}
          />
        </Box>
      ) : output.type === 'number' ? (
        <Box>
          <Typography variant="subtitle2">{t('defaultValue')}</Typography>

          <NumberField
            disabled={Boolean(disabled)}
            hiddenLabel
            fullWidth
            placeholder={t('outputParameterDefaultValuePlaceholder')}
            value={output.defaultValue || ''}
            onChange={(value) => (output.defaultValue = value)}
          />
        </Box>
      ) : output.type === 'boolean' ? (
        <Box>
          <Typography variant="subtitle2">{t('defaultValue')}</Typography>

          <Switch
            checked={output.defaultValue || false}
            onChange={(_, checked) => {
              output.defaultValue = checked;
            }}
          />
        </Box>
      ) : null;
    }

    return null;
  };

  const settingsChildren = renderParameterSettings(output);

  return (
    <>
      {children || (
        <PopperMenu
          ButtonProps={{
            sx: { minWidth: 0, p: 0.5, ml: -0.5 },
            ...bindTrigger(parameterSettingPopperState),
            disabled,
            children: <Box component={Icon} icon={DotsIcon} sx={{ color: '#3B82F6' }} />,
          }}
          PopperProps={{ placement: 'bottom-end' }}>
          <MenuItem
            disabled={Boolean(output.from?.type === 'output')}
            onClick={() => (output.hidden = !output.hidden)}>
            {output.hidden ? t('activeOutputTip') : t('hideOutputTip')}
          </MenuItem>

          {depth === 0 && (
            <MenuItem
              data-testid="output-actions-cell-setting"
              disabled={Boolean(output.from?.type === 'output' || output.from?.type === 'variable')}
              onClick={() => {
                setSetting('setting');
                dialogState.open();
              }}>
              {t('setting')}
            </MenuItem>
          )}

          {isSaveAs && (
            <MenuItem
              disabled={Boolean(output.from?.type === 'output')}
              onClick={() => {
                setSetting('save');
                dialogState.open();
              }}>
              {t('saveToMemory')}
            </MenuItem>
          )}

          {onDelete && (
            <MenuItem
              data-testid="output-actions-cell-delete"
              sx={{ color: 'error.main', fontSize: 13 }}
              onClick={onDelete}>
              {t('delete')}
            </MenuItem>
          )}
        </PopperMenu>
      )}

      {!children && (
        <Dialog
          disableEnforceFocus
          open={dialogState.visible || false}
          onClose={dialogState.close}
          fullWidth
          maxWidth="sm"
          component="form"
          data-testid="output-actions-cell-dialog"
          onSubmit={(e) => e.preventDefault()}>
          <DialogTitle className="between">
            <Box>
              <SettingDialogTitle output={output} />
            </Box>

            <IconButton size="small" onClick={dialogState.close}>
              <Close />
            </IconButton>
          </DialogTitle>

          <DialogContent>
            <Stack gap={1}>
              {currentSetting !== 'save' && (
                <>
                  <OutputActiveWhen agent={assistant} output={output} />

                  <OutputFromSettings agent={assistant} output={output} />

                  {settingsChildren && <Divider textAlign="left">{t('basic')}</Divider>}
                </>
              )}

              {settingsChildren}

              {currentSetting !== 'save' && <AppearanceComponentSettings output={output} />}
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button variant="contained" onClick={dialogState.close}>
              {t('ok')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
};

function OutputActiveWhen({ agent, output }: { agent: AssistantYjs; output: OutputVariableYjs }) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();

  return (
    <>
      <Divider textAlign="left">{t('activeWhen')}</Divider>

      <PromptEditorField
        assistant={agent}
        projectId={projectId}
        gitRef={projectRef}
        path={['outputs', output.id, 'activeWhen']}
        value={output.activeWhen || ''}
        includeOutputVariables
        onChange={(value) => {
          output.activeWhen = value;
        }}
      />
    </>
  );
}

function OutputFromSettings({ agent, output }: { agent: AssistantYjs; output: OutputVariableYjs }) {
  const { t } = useLocaleContext();
  const Settings = OutputFromSettingsMap[output.from?.type || 'process'];

  if (!Settings) return null;

  return (
    <>
      <Divider textAlign="left">{t('from')}</Divider>

      <Settings agent={agent} output={output} />
    </>
  );
}

const OutputFromSettingsMap: { [key: string]: ComponentType<{ agent: AssistantYjs; output: OutputVariableYjs }> } = {
  process: OutputFromProcessSettings,
  callAgent: OutputFromCallAgentSettings,
};

function OutputFromProcessSettings({ agent, output }: { agent: AssistantYjs; output: OutputVariableYjs }) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();

  return (
    <Stack>
      <Typography variant="subtitle2">{t('template')}</Typography>

      <PromptEditorField
        assistant={agent}
        projectId={projectId}
        gitRef={projectRef}
        path={['outputs', output.id, 'from']}
        value={output.valueTemplate || ''}
        includeOutputVariables
        onChange={(value) => {
          output.valueTemplate = value;
        }}
      />
    </Stack>
  );
}

function OutputFromCallAgentSettings({ agent, output }: { agent: AssistantYjs; output: OutputVariableYjs }) {
  const { t } = useLocaleContext();
  if (output.from?.type !== 'callAgent') return null;

  const agentId = output.from.callAgent?.agentId;

  return (
    <Stack>
      <Box>
        <Typography variant="subtitle2">{t('chooseObject', { object: t('agent') })}</Typography>

        <AgentSelect
          type="tool"
          excludes={[agent.id]}
          autoFocus
          disableClearable
          value={
            agentId
              ? {
                  id: agentId,
                  projectId: output.from.callAgent?.projectId,
                  blockletDid: output.from.callAgent?.blockletDid,
                }
              : undefined
          }
          onChange={(_, v) => {
            if (v) {
              if (output.from?.type !== 'callAgent') return;
              output.from.callAgent = {
                blockletDid: v.blockletDid,
                projectId: v.projectId,
                agentId: v.id,
              };
            }
          }}
        />
      </Box>

      {agentId && <AgentParametersForm agent={agent} output={output} />}
    </Stack>
  );
}

function AgentParametersForm({ agent, output }: { agent: AssistantYjs; output: OutputVariableYjs }) {
  if (output.from?.type !== 'callAgent') return null;

  const callAgent = output.from.callAgent;
  if (!callAgent?.agentId) return null;

  const { t } = useLocaleContext();

  const tool = useAgent({
    type: 'tool',
    projectId: callAgent.projectId,
    agentId: callAgent.agentId,
    blockletDid: callAgent.blockletDid,
  });
  const { projectId, projectRef } = useCurrentProject();

  if (!tool) return null;

  return (
    <Stack gap={2}>
      <AuthorizeButton agent={tool} />

      <Box>
        <Typography variant="subtitle2">{t('inputs')}</Typography>

        <Box>
          {tool.parameters?.map((data) => {
            if (!data?.key || data.type === 'source' || data.hidden) return null;

            const placeholder = data.placeholder?.replace(/([^\w]?)$/, '');

            return (
              <Stack key={data.id}>
                <Typography variant="caption">{data.label || data.key}</Typography>

                <PromptEditorField
                  placeholder={`${placeholder ? `${placeholder}, ` : ''}default {{ ${data.key} }}`}
                  value={callAgent.inputs?.[data.key] || ''}
                  projectId={projectId}
                  gitRef={projectRef}
                  assistant={agent}
                  path={[]}
                  includeOutputVariables
                  onChange={(value) => {
                    callAgent.inputs ??= {};
                    callAgent.inputs[data.key!] = value;
                  }}
                />
              </Stack>
            );
          })}
        </Box>
      </Box>
    </Stack>
  );
}

function SettingDialogTitle({ output }: { output: OutputVariableYjs }) {
  const { t } = useLocaleContext();

  const i18nKey = runtimeOutputVariableNames.get(output.name!)?.i18nKey;

  return (
    <span>
      {t('output')} - {i18nKey ? t(i18nKey) : output.name || t('unnamed')}
    </span>
  );
}

export function SettingActionDialogProvider({
  popperRef,
  depth,
  output,
  variable,
  projectId,
  gitRef,
  assistant,
  disabled,
  onRemove,
  children,
}: {
  popperRef?: Ref<PopperButtonImperative>;
  depth: number;
  output: OutputVariableYjs;
  variable?: VariableYjs;
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
  disabled?: boolean;
  onRemove?: () => void;
  children?: any;
}) {
  const runtimeVariable = getRuntimeOutputVariable(output);

  const { getVariables } = useProjectStore(projectId, gitRef);
  const variableYjs = getVariables();
  const variables = (variableYjs?.variables || []).filter((x) => x.type?.type === (output.type || 'string'));

  return (
    <PopperButton
      ref={popperRef}
      depth={depth}
      assistant={assistant}
      isSaveAs={Boolean(depth === 0 && !runtimeVariable && !fromType.includes(output.from?.type || ''))}
      runtimeVariable={Boolean(runtimeVariable)}
      variables={variables}
      variable={variable}
      output={output}
      onDelete={onRemove}
      disabled={Boolean(disabled)}>
      {children}
    </PopperButton>
  );
}
