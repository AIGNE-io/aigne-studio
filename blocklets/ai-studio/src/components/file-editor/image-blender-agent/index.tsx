import { ImageBlenderAssistantYjs } from '@blocklet/ai-runtime/types';
// import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, TextField, Typography } from '@mui/material';
import { SelectTemplates } from '@nft-studio/react';
import { useRef } from 'react';

function CustomTextField(props: any) {
  return <TextField {...props} InputProps={{ startAdornment: null, endAdornment: props?.InputProps?.endAdornment }} />;
}

export default function ImageBlenderAssistantEditor({
  value,
  disabled,
}: {
  value: ImageBlenderAssistantYjs;
  disabled?: boolean;
}) {
  // const doc = (getYjsValue(value) as Map<any>).doc!;
  const selectedTemplatesRef = useRef({});

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        pt: 2,
        borderRadius: 1,
        // overflow: 'hidden',
      }}>
      <SelectTemplates
        ref={selectedTemplatesRef}
        // @ts-ignore
        initialValue={
          value.templateId && value.dynamicData
            ? [
                {
                  _id: value.templateId,
                  templateId: value.templateId,
                  dynamicData: value.dynamicData,
                },
              ]
            : null
        }
        // @ts-ignore
        onChange={(templates: any[]) => {
          const [currentTemplate] = templates;
          value.templateId = currentTemplate?.templateId;
          value.dynamicData = currentTemplate?.dynamicData;
        }}
        slots={{
          ConfigMode: {
            top: (props: any) => (
              <Box
                sx={{
                  width: '100%',
                  mb: 2,
                }}>
                <Typography sx={{ fontSize: 16, fontWeight: 600, mb: 1 }}>SN</Typography>
                <CustomTextField {...props} disabled={disabled} size="small" label="Sn" />
              </Box>
            ),
          },
          TextField: CustomTextField,
        }}
        sx={{ height: '100%', borderRadius: 2 }}
      />
    </Box>
  );
}
