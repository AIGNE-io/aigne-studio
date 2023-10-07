import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import PromptEditor from '@blocklet/prompt-editor';
import { $lexical2text } from '@blocklet/prompt-editor/utils';
import { Add, Delete } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import debounce from 'lodash/debounce';
import { nanoid } from 'nanoid';

import { TemplateYjs } from '../../../api/src/store/projects';
import AwarenessIndicator from '../awareness/awareness-indicator';
import WithAwareness from '../awareness/with-awareness';
import { ReorderableListYjs } from '../reorderable-list';

// import TokenCounter from './token-counter';

export default function Prompts({ value: form }: { value: Pick<TemplateYjs, 'id' | 'prompts'> }) {
  const { t } = useLocaleContext();

  return (
    <>
      {form.prompts && (
        <Box sx={{ py: 1 }}>
          <ReorderableListYjs
            list={form.prompts}
            renderItem={(prompt, index) => {
              const onChange = debounce(async (state) => {
                prompt.contentLexicalJson = JSON.stringify(state);

                const res = await $lexical2text(prompt.contentLexicalJson);
                prompt.role = res.role;
                prompt.content = res.content.replace(/\n+/g, '\n');
              }, 500);

              return (
                <Box sx={{ position: 'relative', display: 'flex', flex: 1 }}>
                  <Box sx={{ flex: 1, mt: 1, position: 'relative' }}>
                    <WithAwareness path={[form.id, 'prompts', index]}>
                      <PromptEditor
                        placeholder={`${t('form.prompt')} ${index + 1}`}
                        value={prompt.contentLexicalJson}
                        onChange={onChange}
                      />
                    </WithAwareness>
                  </Box>

                  <Box sx={{ ml: 0.5 }}>
                    <Button
                      sx={{ minWidth: 0, p: 0.2 }}
                      onClick={() => {
                        delete form.prompts?.[prompt.id];
                      }}>
                      <Delete sx={{ fontSize: 16, color: 'grey.500' }} />
                    </Button>

                    <AwarenessIndicator path={[form.id, 'prompts', index]} />
                  </Box>
                </Box>
              );
            }}
          />
        </Box>
      )}

      <Button
        fullWidth
        size="small"
        startIcon={<Add />}
        onClick={() => {
          const id = nanoid();
          (getYjsValue(form) as Map<any>).doc!.transact(() => {
            form.prompts ??= {};
            form.prompts[id] = { index: Object.keys(form.prompts).length, data: { id, content: '', role: 'system' } };
          });
        }}>
        {t('form.add')} {t('form.prompt')}
      </Button>
    </>
  );
}

// function RoleSelector({ ...props }: SelectProps<Role>) {
//   return (
//     <Select {...props}>
//       <MenuItem value="system">System</MenuItem>
//       <MenuItem value="user">User</MenuItem>
//       <MenuItem value="assistant">Assistant</MenuItem>
//     </Select>
//   );
// }
