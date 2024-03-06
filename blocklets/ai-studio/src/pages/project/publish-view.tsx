import PublishSetting from '@api/store/models/publish-setting';
import LoadingButton from '@app/components/loading/loading-button';
import { useUploader } from '@app/contexts/uploader';
import { getErrorMessage } from '@app/libs/api';
import { savaPublishSetting, updatePublishSetting } from '@app/libs/publish';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import styled from '@emotion/styled';
import UploadIcon from '@mui/icons-material/Upload';
import {
  Box,
  FormControl,
  FormControlLabel,
  IconButton,
  InputBase,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { alpha, styled as muiStyled } from '@mui/material/styles';
import { pick } from 'lodash';
import { useState } from 'react';
import { joinURL } from 'ufo';

const TemplateImage = styled('img')({
  width: '100%',
  height: '100%',
});

const StyledFormControlLabel = muiStyled(FormControlLabel)({
  width: '50%',
  margin: 0,
  '& .MuiTypography-root': {
    width: '95%',
  },
});

const BaseInput = muiStyled(InputBase)(({ theme }) => ({
  '& .MuiInputBase-input': {
    borderRadius: 6,
    padding: '4px 12px',
    backgroundColor: theme.palette.mode === 'light' ? '#F3F6F9' : '#1A2027',
    border: '1px solid',
    borderColor: theme.palette.mode === 'light' ? '#E0E3E7' : '#2D3843',
    transition: theme.transitions.create(['border-color', 'background-color', 'box-shadow']),
    '&:focus': {
      boxShadow: `${alpha(theme.palette.primary.main, 0.25)} 0 0 0 0.2rem`,
      borderColor: theme.palette.primary.main,
    },
  },
}));

const ImageContainer = muiStyled(Box)(() => ({
  width: '100%',
  paddingBottom: '100%',
  position: 'relative',
  borderRadius: 8,
  '.upload-button': {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    cursor: 'pointer',
  },
}));

export default function PublishView({
  projectId,
  refetch,
  assistant,
  projectPublishSetting,
}: {
  projectId: string;
  refetch: () => void;
  assistant: AssistantYjs;
  projectPublishSetting?: PublishSetting;
}) {
  const { t } = useLocaleContext();
  const uploaderRef = useUploader();

  const [settings, setSettings] = useState(
    !projectPublishSetting
      ? {
          template: 'default' as 'default' | 'blue' | 'green' | 'red',
          description: '',
          title: '',
          isCollection: false,
          icon: '',
        }
      : pick(projectPublishSetting, 'template', 'description', 'title', 'isCollection', 'icon')
  );
  const [loading, setLoading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, template: event.target.value as 'default' | 'blue' | 'green' | 'red' });
  };

  return (
    <Stack px={2} mt={1} py={1} gap={2} ml={1}>
      <FormControl>
        <Typography variant="subtitle2" mb={1}>
          {t('templates')}
        </Typography>
        <RadioGroup
          value={settings.template}
          onChange={handleChange}
          row
          sx={{
            rowGap: 1,
          }}>
          <StyledFormControlLabel
            labelPlacement="top"
            control={<Radio />}
            value="default"
            label={<TemplateImage src={joinURL(window?.blocklet?.prefix ?? '/', '/images/template-1.png')} alt="" />}
          />
          <StyledFormControlLabel
            labelPlacement="top"
            control={<Radio />}
            value="blue"
            label={<TemplateImage src={joinURL(window?.blocklet?.prefix ?? '/', '/images/template-2.png')} alt="" />}
          />
          <StyledFormControlLabel
            labelPlacement="top"
            control={<Radio />}
            value="red"
            label={<TemplateImage src={joinURL(window?.blocklet?.prefix ?? '/', '/images/template-3.png')} alt="" />}
          />
          <StyledFormControlLabel
            labelPlacement="top"
            control={<Radio />}
            value="green"
            label={<TemplateImage src={joinURL(window?.blocklet?.prefix ?? '/', '/images/template-4.png')} alt="" />}
          />
        </RadioGroup>
      </FormControl>

      <FormControl>
        <Typography mb={1} variant="subtitle2">
          {t('publish.title')}
        </Typography>
        <BaseInput
          id="project-name"
          placeholder={t('publish.titlePlaceholder')}
          value={settings.title}
          onChange={(e) => setSettings({ ...settings, title: e.target.value })}
        />
      </FormControl>
      <FormControl>
        <Typography mb={1} variant="subtitle2">
          {t('publish.description')}
        </Typography>
        <BaseInput
          multiline
          sx={{
            padding: 0,
          }}
          placeholder={t('publish.descriptionPlaceholder')}
          minRows={5}
          id="description"
          value={settings.description}
          onChange={(e) => setSettings({ ...settings, description: e.target.value })}
        />
      </FormControl>

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="subtitle2">{t('publish.collectionManage')}</Typography>
        <Switch
          checked={settings.isCollection}
          onChange={(_, checked) => setSettings({ ...settings, isCollection: checked })}
        />
      </Box>

      <Box>
        <Typography mb={1} variant="subtitle2">
          {t('publish.favicon')}
        </Typography>

        <Box mb={0.5} width="40%">
          <ImageContainer
            onClick={() => {
              // @ts-ignore
              const uploader = uploaderRef?.current?.getUploader();

              uploader?.open();

              uploader.onceUploadSuccess((data: any) => {
                const { response } = data;
                const url = response?.data?.url || response?.data?.fileUrl;
                setSettings({ ...settings, icon: url });
              });
            }}>
            {settings.icon ? (
              <img className="upload-button" src={settings.icon} alt="" />
            ) : (
              <IconButton
                className="upload-button"
                key="uploader-trigger"
                size="small"
                sx={{ borderRadius: 0.5, bgcolor: 'rgba(0, 0, 0, 0.06)' }}>
                <UploadIcon />
              </IconButton>
            )}
          </ImageContainer>
        </Box>

        <Typography variant="caption" color="text.secondary">
          {t('publish.faviconDescription')}
        </Typography>
      </Box>
      <LoadingButton
        sx={{
          mt: 3,
        }}
        loading={loading}
        variant="contained"
        onClick={async () => {
          try {
            setLoading(true);
            if (projectPublishSetting) {
              await updatePublishSetting({
                ...settings,
                assistantId: assistant.id,
                projectId,
              });
              refetch();
              Toast.success(t('alert.saved'));
            } else {
              await savaPublishSetting({
                ...settings,
                assistantId: assistant.id,
                projectId,
              });
              refetch();
              Toast.success(t('publish.publishSuccess'));
            }
          } catch (error) {
            Toast.error(getErrorMessage(error));
            throw error;
          } finally {
            setLoading(false);
          }
        }}>
        {projectPublishSetting ? t('publish.save') : t('publish.publishProject')}
      </LoadingButton>
    </Stack>
  );
}
