import { ImageBlenderAssistantYjs } from '@blocklet/ai-runtime/types';
import { Box, TextField } from '@mui/material';
import { SelectTemplates } from '@nft-studio/react';
import { cloneDeep } from 'lodash';
import { useRef } from 'react';

import useVariablesEditorOptions from '../use-variables-editor-options';

function CustomTextField(props: any) {
  return <TextField {...props} InputProps={{ startAdornment: null, endAdornment: props?.InputProps?.endAdornment }} />;
}

export default function ImageBlenderAssistantEditor({ value }: { value: ImageBlenderAssistantYjs }) {
  const selectedTemplatesRef = useRef({});
  const { addParameter } = useVariablesEditorOptions(value);

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        pt: 2,
        borderRadius: 1,
      }}>
      <SelectTemplates
        ref={selectedTemplatesRef}
        // @ts-ignore
        value={
          value.templateId
            ? [
                {
                  _id: value.templateId,
                  templateId: value.templateId,
                  dynamicData: value.dynamicData || {},
                },
              ]
            : null
        }
        // @ts-ignore
        onChange={(templates: any[]) => {
          const [currentTemplate] = templates;

          value.templateId = currentTemplate?.templateId;
          value.dynamicData = cloneDeep(currentTemplate?.dynamicData || {});
          const dynamicInputList = cloneDeep(currentTemplate?.dynamicInputList || []);

          if (Array.isArray(dynamicInputList)) {
            dynamicInputList.forEach((item) => {
              item.value = `{{${item.key}}}`;

              if (value.dynamicData) {
                value.dynamicData[item.key] = item.value;
              }

              const isImage = item.type === 'basic-image';
              const parameter = Object.values(value?.parameters ?? {});
              const found = parameter.find((i) => {
                return i.data.key === item.key && i.data.type === 'string' && (isImage ? i.data.image : true);
              });

              if (!found) addParameter(item.key, { isImage, type: 'string' });
            });
          }
        }}
        slots={{
          ConfigMode: {
            infoWrapper: () => null,
          },
          TextField: CustomTextField,
        }}
        sx={{ height: '100%', borderRadius: 2 }}
      />
    </Box>
  );
}
