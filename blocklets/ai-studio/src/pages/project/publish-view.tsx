import LoadingButton from '@app/components/loading/loading-button';
import PublishEntries from '@app/components/publish/PublishEntries';
import NumberField from '@app/components/template-form/number-field';
import { useUploader } from '@app/contexts/uploader';
import { getErrorMessage } from '@app/libs/api';
import { AI_RUNTIME_COMPONENT_DID } from '@app/libs/constants';
import { createRelease, updateRelease } from '@app/libs/release';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import Toast from '@arcblock/ux/lib/Toast';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Map, getYjsValue } from '@blocklet/co-git/yjs';
import ComponentInstaller from '@blocklet/ui-react/lib/ComponentInstaller';
import styled from '@emotion/styled';
import { LaunchRounded } from '@mui/icons-material';
import UploadIcon from '@mui/icons-material/Upload';
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  InputBase,
  Link,
  Radio,
  RadioGroup,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { alpha, styled as muiStyled } from '@mui/material/styles';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import QRCode from 'react-qr-code';
import { joinURL, withQuery } from 'ufo';

import { saveButtonState, useProjectState } from './state';

const TemplateImage = styled('img')({
  width: '100%',
  height: '100%',
});

const StyledFormControlLabel = muiStyled(FormControlLabel)({
  width: '50%',
  maxWidth: 200,
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
  projectRef,
  assistant,
}: {
  projectId: string;
  projectRef: string;
  assistant: AssistantYjs;
}) {
  return (
    <ComponentInstaller
      did={[
        'z2qa6fvjmjew4pWJyTsKaWFuNoMUMyXDh5A1D',
        'z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk',
        'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o',
      ]}>
      <PublishViewContent projectId={projectId} projectRef={projectRef} assistant={assistant} />
    </ComponentInstaller>
  );
}

function PublishViewContent({
  projectId,
  projectRef,
  assistant,
}: {
  projectId: string;
  projectRef: string;
  assistant: AssistantYjs;
}) {
  const doc = (getYjsValue(assistant) as Map<any>).doc!;

  const setRelease = (update: (release: NonNullable<AssistantYjs['release']>) => void) => {
    doc.transact(() => {
      assistant.release ??= {};
      update(assistant.release);
    });
  };

  const { t, locale } = useLocaleContext();
  const uploaderRef = useUploader();

  const {
    state: { releases },
    refetch,
  } = useProjectState(projectId, projectRef);

  const release = releases?.find((i) => i.projectRef === projectRef && i.assistantId === assistant.id);

  const releaseUrl = useMemo(() => {
    if (!release) return undefined;
    const pagesPrefix = blocklet?.componentMountPoints.find((i) => i.name === 'pages-kit')?.mountPoint || '/';
    return withQuery(joinURL(globalThis.location.origin, pagesPrefix, `@${AI_RUNTIME_COMPONENT_DID}`, '/ai/chat'), {
      aiReleaseId: release.id,
    });
  }, [release]);

  const form = useForm();

  const onSubmit = async () => {
    try {
      const assistantId = assistant.id;
      const paymentEnabled = assistant.release?.payment?.enable;
      const paymentUnitAmount = assistant.release?.payment?.price;

      if (!(await saveButtonState.getState().save?.())?.saved) return;

      if (!release) {
        await createRelease({
          projectRef,
          projectId,
          assistantId,
          paymentEnabled,
          paymentUnitAmount,
        });
        await refetch({ force: true });
        Toast.success(t('publish.publishSuccess'));
      } else {
        await updateRelease(release.id, {
          paymentEnabled,
          paymentUnitAmount,
        });
        await refetch({ force: true });
        Toast.success(t('publish.updateSuccess'));
      }
    } catch (error) {
      Toast.error(getErrorMessage(error));
      throw error;
    }
  };

  return (
    <Stack px={2} mt={1} py={1} gap={2} ml={1} overflow="auto" component="form" onSubmit={form.handleSubmit(onSubmit)}>
      <FormControl>
        <Typography variant="subtitle2" mb={1}>
          {t('templates')}
        </Typography>
        <RadioGroup
          row
          sx={{ rowGap: 1 }}
          value={assistant.release?.template || ''}
          onChange={(_, value) => setRelease((release) => (release.template = value))}>
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

      <Stack>
        <Typography variant="subtitle2" mb={1}>
          {t('entries')}
        </Typography>

        <PublishEntries assistant={assistant} />
      </Stack>

      <FormControl>
        <Typography mb={1} variant="subtitle2">
          {t('publish.title')}
        </Typography>
        <BaseInput
          placeholder={t('publish.titlePlaceholder')}
          value={assistant.release?.title || ''}
          onChange={(e) => setRelease((release) => (release.title = e.target.value))}
        />
      </FormControl>

      <FormControl>
        <Typography mb={1} variant="subtitle2">
          {t('publish.description')}
        </Typography>
        <BaseInput
          multiline
          sx={{ padding: 0 }}
          placeholder={t('publish.descriptionPlaceholder')}
          minRows={3}
          value={assistant.release?.description || ''}
          onChange={(e) => setRelease((release) => (release.description = e.target.value))}
        />
      </FormControl>

      <FormControl>
        <Typography mb={1} variant="subtitle2">
          {t('publish.conversionOpener')}
        </Typography>
        <BaseInput
          multiline
          sx={{ padding: 0 }}
          placeholder={t('publish.conversionOpenerDescription')}
          minRows={3}
          value={assistant.release?.openerMessage || ''}
          onChange={(e) => setRelease((release) => (release.openerMessage = e.target.value))}
        />
      </FormControl>

      <Box>
        <Typography mb={1} variant="subtitle2">
          {t('publish.logo')}
        </Typography>

        <Box mb={0.5} width="40%" maxWidth={120}>
          <ImageContainer
            onClick={() => {
              // @ts-ignore
              const uploader = uploaderRef?.current?.getUploader();

              uploader?.open();

              uploader.onceUploadSuccess((data: any) => {
                const { response } = data;
                const url = response?.data?.url || response?.data?.fileUrl;
                setRelease((release) => (release.logo = url));
              });
            }}>
            {assistant.release?.logo ? (
              <img className="upload-button" src={assistant.release.logo} alt="" />
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
      </Box>

      <Stack
        sx={{
          display: 'table',
          '.row': {
            display: 'table-row',
            '> div': {
              display: 'table-cell',
              whiteSpace: 'nowrap',
              '&:first-of-type': {
                pr: 2,
              },

              '&:last-of-type': {
                width: '100%',
              },
            },
          },
        }}>
        <Typography mb={1} variant="subtitle2">
          {t('publish.settings')}
        </Typography>

        <Box className="row">
          <Box>
            <FormLabel>{t('publish.maxRoundLimit')}</FormLabel>
          </Box>
          <Box>
            <NumberField
              component={BaseInput}
              NumberProps={{
                min: 0,
                value: assistant.release?.maxRoundLimit ?? null,
                onChange: (_, value) =>
                  setRelease((release) => {
                    release.maxRoundLimit = value;
                  }),
              }}
            />
          </Box>
        </Box>

        <Box className="row">
          <Box>
            <FormLabel>{t('publish.reachMaxRoundLimitTip')}</FormLabel>
          </Box>
          <Box>
            <BaseInput
              fullWidth
              multiline
              value={assistant.release?.reachMaxRoundLimitTip ?? ''}
              onChange={(e) =>
                setRelease((release) => {
                  release.reachMaxRoundLimitTip = e.target.value;
                })
              }
            />
          </Box>
        </Box>
      </Stack>

      <Box>
        <Typography mb={1} variant="subtitle2">
          {t('publish.payment')}
        </Typography>

        <Stack gap={1}>
          <Stack direction="row" gap={1} alignItems="center">
            <FormLabel sx={{ width: 60 }}>{t('publish.enabled')}</FormLabel>
            <FormControl>
              <Switch
                checked={assistant.release?.payment?.enable || false}
                onChange={(_, checked) =>
                  setRelease((release) => {
                    release.payment ??= {};
                    release.payment.enable = checked;
                  })
                }
              />
            </FormControl>
          </Stack>

          {assistant.release?.payment?.enable && (
            <Stack direction="row" gap={1} alignItems="center">
              <FormLabel sx={{ width: 60 }}>{t('publish.price')}</FormLabel>
              <TextField
                hiddenLabel
                InputProps={{ endAdornment: <InputAdornment position="end">ABT / {t('publish.time')}</InputAdornment> }}
                value={assistant.release.payment.price ?? ''}
                onChange={(e) =>
                  setRelease((release) => {
                    release.payment ??= {};
                    release.payment.price = e.target.value;
                  })
                }
              />
            </Stack>
          )}
        </Stack>
      </Box>

      {release && releaseUrl && (
        <Stack gap={1}>
          <Typography variant="subtitle2">{t('publish.link')}</Typography>

          <Link href={releaseUrl} target="_blank" sx={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
            <Typography component="span" sx={{ textOverflow: 'ellipsis', overflow: 'hidden', flexShrink: 1 }}>
              {releaseUrl}
            </Typography>

            <LaunchRounded sx={{ color: 'text.secondary', fontSize: 16 }} />
          </Link>

          <Box component={QRCode} value={releaseUrl} sx={{ width: 120, height: 120 }} />

          <Box color="text.secondary">
            <Typography component="span" mr={1}>
              {t('alert.updatedAt')}
            </Typography>

            <RelativeTime locale={locale} value={release.updatedAt} relativeRange={3600e3} />
          </Box>
        </Stack>
      )}

      <Stack direction="row" gap={2} alignItems="center" sx={{ mt: 3 }}>
        <LoadingButton type="submit" loading={form.formState.isSubmitting} variant="contained">
          {release ? t('publish.update') : t('publish.publishProject')}
        </LoadingButton>
      </Stack>
    </Stack>
  );
}
