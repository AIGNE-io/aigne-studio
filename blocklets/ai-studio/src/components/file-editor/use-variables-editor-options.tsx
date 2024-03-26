import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs, ParameterYjs, randomId } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { INSERT_VARIABLE_COMMAND, VariablePickerOption } from '@blocklet/prompt-editor';
import { DataObjectRounded } from '@mui/icons-material';
import { alpha } from '@mui/material';
import { useCallback, useMemo } from 'react';
import { atom, useRecoilState } from 'recoil';

const highlightedState = atom<null | string>({ key: 'highlightedState', default: null });
const useHighlightedState = () => useRecoilState(highlightedState);

export default function useVariablesEditorOptions(assistant?: AssistantYjs) {
  const { t } = useLocaleContext();
  const [highlightedId, setHighlightedId] = useHighlightedState();
  const from: 'editor' = 'editor';

  const variableSet = new Set(
    assistant?.parameters &&
      Object.values(assistant.parameters)
        .map((i) => i.data.key)
        .filter((i): i is string => !!i)
  );

  if (assistant && 'prepareExecutes' in assistant && assistant.prepareExecutes) {
    for (const { data } of Object.values(assistant.prepareExecutes)) {
      if (data.variable) variableSet.add(data.variable);
    }
  }

  if (assistant && 'prompts' in assistant && assistant.prompts) {
    for (const { data } of Object.values(assistant.prompts)) {
      if (data.type === 'executeBlock') {
        const { variable } = data.data;
        if (variable) variableSet.add(variable);
      }
    }
  }

  const variables = [...variableSet];

  const options = useMemo(() => {
    return (variables ?? [])
      .map((key) => {
        return new VariablePickerOption(key, {
          icon: (
            <DataObjectRounded
              sx={{
                color: (theme) => alpha(theme.palette.primary.main, 1),
                fontSize: (theme) => theme.typography.body1.fontSize,
              }}
            />
          ),
          onSelect: (editor) => {
            editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: key });
          },
        });
      })
      .concat([
        new VariablePickerOption(`${t('form.add')}${t('variable')}`, {
          disabled: true,
          replaceTitle: `${t('form.add')}$$$${t('variable')}`,
          icon: (
            <DataObjectRounded
              sx={{
                color: (theme) => alpha(theme.palette.primary.main, 1),
                fontSize: (theme) => theme.typography.body1.fontSize,
              }}
            />
          ),
          onSelect: (editor, matchingString) => {
            if (matchingString) addParameter(matchingString, from);
            editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: matchingString || '' });
          },
        }),
      ]);
  }, [variables?.join('/'), t]);

  const addParameter = useCallback(
    (parameter: string, from?: 'editor') => {
      if (!assistant) return undefined;

      const doc = (getYjsValue(assistant) as Map<any>).doc!;
      const id = randomId();

      doc.transact(() => {
        assistant.parameters ??= {};

        if (!parameter || !variables.includes(parameter)) {
          assistant.parameters[id] = {
            index: Math.max(-1, ...Object.values(assistant.parameters).map((i) => i.index)) + 1,
            data: { id, key: parameter, from },
          };

          setHighlightedId(id);
          setTimeout(() => setHighlightedId(null), 500);
        }
      });

      return id;
    },
    [assistant, variables?.join('/')]
  );

  const deleteParameter = useCallback(
    (parameter: ParameterYjs) => {
      if (!assistant) return;

      const doc = (getYjsValue(assistant) as Map<any>).doc!;
      doc.transact(() => {
        if (!assistant.parameters) return;
        delete assistant.parameters[parameter.id];
        Object.values(assistant.parameters).forEach((item, index) => (item.index = index));
      });
    },
    [assistant]
  );

  const removeParameter = useCallback(
    (key: string) => {
      if (!assistant) return;

      const doc = (getYjsValue(assistant) as Map<any>).doc!;
      doc.transact(() => {
        if (!assistant.parameters) return;
        for (const id of Object.keys(assistant.parameters)) {
          if (assistant.parameters[id]?.data.key === key) delete assistant.parameters[id];
        }
      });
    },
    [assistant]
  );
  return { from, options, variables, addParameter, deleteParameter, removeParameter, highlightedId };
}
