import AigneLogo from '@app/icons/aigne-logo';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { ImageBlenderAssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import { Box, TextField } from '@mui/material';
import { SelectTemplates } from '@nft-studio/react';
import { cloneDeep, uniqBy } from 'lodash';
import { nanoid } from 'nanoid';
import { useRef } from 'react';

function CustomTextField(props: any) {
  return <TextField {...props} InputProps={{ startAdornment: null, endAdornment: props?.InputProps?.endAdornment }} />;
}

function ConfigWrapper(props: any) {
  return (
    <Box
      sx={{
        height: '100%',
        position: 'relative',
        px: 0.25,
      }}>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.4)',
          '-webkit-backdrop-filter': 'blur(1.8px)',
          '-moz-backdrop-filter': 'blur(1.8px)',
          '-o-backdrop-filter': 'blur(1.8px)',
          '-ms-backdrop-filter': 'blur(1.8px)',
          backdropFilter: 'blur(1.8px)',
          '@supports not ((backdrop-filter: blur(1.8px)) or (-webkit-backdrop-filter: blur(1.8px)))': {
            bgcolor: (theme) => theme.palette.background.paper,
          },
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
          gap: 0.25,
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
        <Box>{props?.t?.('selectTemplateDynamicInputTip')}</Box>
      </Box>

      {props?.children}
    </Box>
  );
}

export default function ImageBlenderAssistantEditor({ value }: { value: ImageBlenderAssistantYjs }) {
  const selectedTemplatesRef = useRef({});
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
        includeSnapshotTemplates
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
        onChange={(templates: any) => {
          const doc = (getYjsValue(value) as Map<any>).doc!;
          doc.transact(() => {
            const [currentTemplate] = templates;

            if (!value.templateId && currentTemplate?.templateId) {
              value.parameters = {};
            }

            value.parameters ??= {};

            value.templateId = currentTemplate?.templateId;
            value.dynamicData = cloneDeep(currentTemplate?.dynamicData || {});
            const dynamicInputList = uniqBy(cloneDeep(currentTemplate?.dynamicInputList || []), 'key');

            const originalKeys = new Set(Object.values(value.parameters || {}).map((i) => i.data.key));
            const dynamicInputKeys = new Set(dynamicInputList.map((i: any) => i.key));

            const parameters = Object.values(value.parameters);
            parameters.forEach((parameter) => {
              if (parameter.data.from === 'imageBlenderParameter' && !dynamicInputKeys.has(parameter.data.key)) {
                delete value.parameters![parameter.data.id];
              }
            });

            if (Array.isArray(dynamicInputList)) {
              dynamicInputList.forEach((item: any, index) => {
                value.dynamicData ??= {};
                value.dynamicData[item.key] = `{{${item.key}}}`;
                const isImage = item.type === 'basic-image';

                if (!originalKeys.has(item.key)) {
                  const id = nanoid();
                  value.parameters![id] = {
                    index: parameters.length + index,
                    data: {
                      id,
                      key: item.key,
                      type: isImage ? 'image' : 'string',
                      from: 'imageBlenderParameter',
                      label: item.key,
                    },
                  };
                }
              });
            }

            Object.values(value.parameters).forEach((item, index) => (item.index = index));
          });
        }}
        slots={{
          ConfigMode: {
            infoWrapper: () => null,
            configWrapper: (props: any) => <ConfigWrapper {...props} t={t} />,
          },
          TextField: CustomTextField,
        }}
        sx={{ height: '100%', borderRadius: 2 }}
      />
    </Box>
  );
}
