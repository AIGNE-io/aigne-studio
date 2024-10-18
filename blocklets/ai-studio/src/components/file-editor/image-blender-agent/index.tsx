import AigneLogo from '@app/icons/aigne-logo';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
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
  const { t } = useLocaleContext();

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
            configWrapper: (props: any) => {
              return (
                <Box
                  sx={{
                    height: '100%',
                    position: 'relative',
                    px: 1,
                  }}>
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backdropFilter: 'blur(2px)',
                      backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      zIndex: 10,
                    }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '100%',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 11,
                      textAlign: 'center',
                      fontWeight: 'bold',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}>
                    <Box
                      sx={{
                        animation: 'headShake 1.5s ease-in-out infinite',
                        '@keyframes headShake': {
                          '0%': { transform: 'translateX(0)' },
                          '6.5%': { transform: 'translateX(-6px) rotateY(-9deg)' },
                          '18.5%': { transform: 'translateX(5px) rotateY(7deg)' },
                          '31.5%': { transform: 'translateX(-3px) rotateY(-5deg)' },
                          '43.5%': { transform: 'translateX(2px) rotateY(3deg)' },
                          '50%': { transform: 'translateX(0)' },
                        },
                      }}>
                      <AigneLogo />
                    </Box>
                    <Box>{t('selectTemplateDynamicInputTip')}</Box>
                  </Box>

                  {props.children}
                </Box>
              );
            },
          },
          TextField: CustomTextField,
        }}
        sx={{ height: '100%', borderRadius: 2 }}
      />
    </Box>
  );
}
