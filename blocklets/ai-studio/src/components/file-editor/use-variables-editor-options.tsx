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

type VariableEditorOptions = {
  from?: 'editor' | 'agentParameter' | 'knowledgeParameter' | 'blockletAPIParameter' | 'imageBlenderParameter';
  type?: any;
  source?: any;
};

export default function useVariablesEditorOptions(
  assistant?: AssistantYjs,
  { includeOutputVariables }: { includeOutputVariables?: boolean } = {}
) {
  const { t } = useLocaleContext();
  const [highlightedId, setHighlightedId] = useHighlightedState();
  const from: 'editor' = 'editor';

  const variableSet = new Set([
    ...Object.values(assistant?.parameters ?? {})
      .filter((i) => !i.data.hidden)
      .map((i) => i.data.key)
      .filter((i): i is string => !!i),
    ...(includeOutputVariables
      ? Object.values(assistant?.outputVariables ?? {})
          .filter((i) => !i.data.hidden)
          .map((i) => i.data.name)
          .filter((i): i is string => !!i)
      : []),
  ]);

  const variables = [...variableSet, '$sys'];

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
        new VariablePickerOption(`${t('add')}${t('variable')}`, {
          disabled: true,
          replaceTitle: `${t('add')}$$$${t('variable')}`,
          icon: (
            <DataObjectRounded
              sx={{
                color: (theme) => alpha(theme.palette.primary.main, 1),
                fontSize: (theme) => theme.typography.body1.fontSize,
              }}
            />
          ),
          onSelect: (editor, matchingString) => {
            if (matchingString) addParameter(matchingString, { from });
            editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: matchingString || '' });
          },
        }),
      ]);
  }, [variables?.join('/'), t]);

  const addParameter = useCallback(
    (parameter: string, { from, source, type }: VariableEditorOptions = {}) => {
      if (!assistant) return undefined;

      const doc = (getYjsValue(assistant) as Map<any>).doc!;
      const id = randomId();

      doc.transact(() => {
        assistant.parameters ??= {};

        const key = (parameter || '').split('.')[0] || '';
        if (!parameter || !variables.includes(key)) {
          const data = {
            id,
            key,
            ...(from ? { from } : {}),
            ...(type ? { type } : {}),
            ...(source ? { source } : {}),
          };

          assistant.parameters[id] = {
            index: Math.max(-1, ...Object.values(assistant.parameters).map((i) => i.index)) + 1,
            data,
          };

          setHighlightedId(id);
          setTimeout(() => setHighlightedId(null), 500);
        }
      });

      return id;
    },
    [assistant, variables?.join('/')]
  );

  const updateParameter = useCallback(
    (id: string, parameter: string) => {
      if (!assistant) return undefined;

      const doc = (getYjsValue(assistant) as Map<any>).doc!;

      doc.transact(() => {
        assistant.parameters ??= {};

        const key = (parameter || '').split('.')[0] || '';
        if (id && assistant.parameters[id]) {
          assistant.parameters[id].data.key = key;
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
  return {
    from,
    options,
    variables,
    updateParameter,
    addParameter,
    deleteParameter,
    removeParameter,
    highlightedId,
  };
}
