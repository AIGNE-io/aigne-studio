import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { INSERT_VARIABLE_COMMAND, VariablePickerOption } from '@blocklet/prompt-editor';
import { DataObjectRounded } from '@mui/icons-material';
import { alpha } from '@mui/material';
import { useCallback, useMemo } from 'react';
import { randomId } from 'src/pages/project/prompt-state';
import { AssistantYjs } from 'src/pages/project/yjs-state';

export default function useVariablesEditorOptions(assistant?: AssistantYjs) {
  const { t } = useLocaleContext();

  const keys =
    assistant?.parameters &&
    Object.values(assistant.parameters)
      .map((i) => i.data.key)
      .filter((i): i is string => !!i);

  const options = useMemo(() => {
    return keys
      ?.map((key) => {
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
          icon: (
            <DataObjectRounded
              sx={{
                color: (theme) => alpha(theme.palette.primary.main, 1),
                fontSize: (theme) => theme.typography.body1.fontSize,
              }}
            />
          ),
          onSelect: (editor, matchingString) => {
            if (matchingString) addParameter(matchingString);
            editor.dispatchCommand(INSERT_VARIABLE_COMMAND, { name: matchingString || '' });
          },
        }),
      ]);
  }, [keys?.join('/'), t]);

  const addParameter = useCallback(
    (parameter: string) => {
      if (!assistant) return;

      const doc = (getYjsValue(assistant) as Map<any>).doc!;
      doc.transact(() => {
        assistant.parameters ??= {};

        const id = randomId();
        if (!Object.values(assistant.parameters).some((i) => i.data.key === parameter)) {
          assistant.parameters[id] = {
            index: Math.max(-1, ...Object.values(assistant.parameters).map((i) => i.index)) + 1,
            data: { id, key: parameter },
          };
        }
      });
    },
    [assistant]
  );

  return { options };
}
