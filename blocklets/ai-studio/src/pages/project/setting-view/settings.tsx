import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import {
  Box,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
  formLabelClasses,
} from '@mui/material';

import { TemplateYjs } from '../../../../api/src/store/projects';
import AwarenessIndicator from '../../../components/awareness/awareness-indicator';
import WithAwareness from '../../../components/awareness/with-awareness';
import { useTemplateCompare } from '../state';

export default function SettingView({
  projectId,
  gitRef,
  template,
  compareValue,
  readOnly,
}: {
  projectId: string;
  gitRef: string;
  template: TemplateYjs;
  compareValue?: TemplateYjs;
  readOnly?: boolean;
}) {
  const { t } = useLocaleContext();

  const { getDiffColor } = useTemplateCompare({ value: template, compareValue, readOnly });

  return (
    <Stack sx={{ [`.${formLabelClasses.root}`]: { fontSize: 14 } }}>
      <Typography
        variant="subtitle1"
        sx={{ px: 3, position: 'sticky', top: 48, zIndex: 2, bgcolor: 'background.paper' }}>
        {t('setting')}
      </Typography>

      <Stack mt={-0.5} direction="row" alignItems="center" px={3} position="relative">
        <FormLabel sx={{ minWidth: 60 }}>{t('public')}</FormLabel>

        <Box>
          <Switch
            sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: getDiffColor({ path: 'public', defaultValue: 'false' }),
              },
              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                backgroundColor: getDiffColor({ path: 'public', defaultValue: 'false' }),
              },
            }}
            checked={template.public ?? false}
            onChange={(_, checked) => !readOnly && (template.public = checked)}
          />
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" px={3} position="relative">
        <FormLabel sx={{ minWidth: 60 }}>{t('mode')}</FormLabel>

        <Box>
          <RadioGroup
            row
            value={template.mode ?? 'default'}
            onChange={(_, mode) => !readOnly && (template.mode = mode as any)}
            sx={{
              '.Mui-checked': {
                color: getDiffColor({ path: 'mode', defaultValue: 'default' }),
              },
            }}>
            <FormControlLabel value="default" control={<Radio />} label={t('formMode')} />
            <FormControlLabel value="chat" control={<Radio />} label={t('chatMode')} />
          </RadioGroup>
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" px={3} position="relative">
        <FormLabel sx={{ minWidth: 60 }}>{t('type')}</FormLabel>

        <Box>
          <WithAwareness projectId={projectId} gitRef={gitRef} path={[template.id, 'name']}>
            <RadioGroup
              row
              value={template.type ?? 'text'}
              onChange={(_, type) => {
                if (readOnly) return;
                if (type === 'text') {
                  delete template.type;
                } else {
                  template.type = type as any;
                }
              }}
              sx={{
                '.Mui-checked': {
                  color: getDiffColor({ path: 'type', defaultValue: 'text' }),
                },
              }}>
              <FormControlLabel value="text" control={<Radio />} label={t('text')} />
              <FormControlLabel value="image" control={<Radio />} label={t('image')} />
            </RadioGroup>
          </WithAwareness>

          <AwarenessIndicator
            projectId={projectId}
            gitRef={gitRef}
            path={[template.id, 'name']}
            sx={{ position: 'absolute', right: -16, top: 16 }}
          />
        </Box>
      </Stack>
    </Stack>
  );
}
