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
import { Icon } from '@iconify-icon/react';
import { LaunchRounded } from '@mui/icons-material';
import {
  Box,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputAdornment,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { styled as muiStyled } from '@mui/material/styles';
import { Suspense, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import QRCode from 'react-qr-code';
import { joinURL, withQuery } from 'ufo';

import BaseInput from '../../components/custom/input';
import Switch from '../../components/custom/switch';
import UploadIcon from './icons/publish-upload';
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
    <Suspense fallback={<CircularProgress />}>
      <ComponentInstaller
        did={[
          'z2qa6fvjmjew4pWJyTsKaWFuNoMUMyXDh5A1D',
          'z2qaCNvKMv5GjouKdcDWexv6WqtHbpNPQDnAk',
          'z8iZiDFg3vkkrPwsiba1TLXy3H9XHzFERsP8o',
        ]}>
        <PublishViewContent projectId={projectId} projectRef={projectRef} assistant={assistant} />
      </ComponentInstaller>
    </Suspense>
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
    state: { releases, project },
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

  useEffect(() => {
    if (project) {
      if (!assistant.release?.title && project.name) setRelease((release) => (release.title = project.name));
      if (!assistant.release?.description && project.description)
        setRelease((release) => (release.description = project.description));
    }
  }, [project]);

  const form = useForm();

  const onSubmit = async () => {
    try {
      const assistantId = assistant.id;
      const paymentEnabled = assistant.release?.payment?.enable;
      const paymentUnitAmount = assistant.release?.payment?.price;

      if (!(await saveButtonState.getState().save?.({ skipConfirm: true }))?.saved) return;

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

      setTimeout(() => {
        document.getElementById('create-release-button')?.scrollIntoView({ behavior: 'smooth' });
      });
    } catch (error) {
      console.error('failed to publish', { error });
      Toast.error(getErrorMessage(error));
    }
  };

  return (
    <Stack px={2} mt={1} py={1} gap={2} ml={1} overflow="auto" component="form" onSubmit={form.handleSubmit(onSubmit)}>
      <FormControl>
        <Typography variant="subtitle2" mb={0.5}>
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

      <PublishEntries assistant={assistant} />

      <FormControl>
        <Typography mb={0.5} variant="subtitle2">
          {t('publish.title')}
        </Typography>
        <BaseInput
          placeholder={t('publish.titlePlaceholder')}
          value={assistant.release?.title || project?.name || ''}
          onChange={(e) => setRelease((release) => (release.title = e.target.value))}
        />
      </FormControl>

      <FormControl>
        <Typography mb={0.5} variant="subtitle2">
          {t('publish.description')}
        </Typography>
        <BaseInput
          multiline
          sx={{ padding: 0 }}
          placeholder={t('publish.descriptionPlaceholder')}
          minRows={3}
          value={assistant.release?.description || project?.description || ''}
          onChange={(e) => setRelease((release) => (release.description = e.target.value))}
        />
      </FormControl>

      <FormControl>
        <Typography mb={0.5} variant="subtitle2">
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
        <Typography mb={0.5} variant="subtitle2">
          {t('publish.logo')}
        </Typography>

        <Box mb={0.5}>
          <Box
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
              <Box
                component="img"
                src={assistant.release.logo}
                alt=""
                sx={{ width: 100, height: 100, borderRadius: 1, cursor: 'pointer' }}
              />
            ) : (
              <Box width={1} display="flex" gap={1.5}>
                <IconButton
                  key="uploader-trigger"
                  size="small"
                  sx={{ borderRadius: 1, bgcolor: 'rgba(0, 0, 0, 0.06)', width: 100, height: 100 }}>
                  <UploadIcon sx={{ fontSize: 100 }} />
                </IconButton>

                <Typography variant="subtitle3">Supported file formats include PNG, JPG, and SVG.</Typography>
              </Box>
            )}
          </Box>
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
        </Box>

        <Box className="row">
          <Box>
            <FormLabel>{t('publish.reachMaxRoundLimitTip')}</FormLabel>
          </Box>
          <Box>
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
        </Box>
      </Stack>

      <Stack>
        <Stack direction="row" gap={1} alignItems="center" className="between">
          <Typography mb={0.5} variant="subtitle2">
            {t('publish.payment')}
          </Typography>

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
          <Stack direction="row" gap={1} alignItems="center" className="between">
            <Box flex={1}>
              <FormLabel sx={{ width: 60 }}>{t('publish.price')}</FormLabel>
            </Box>
            <Box flex={1}>
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
            </Box>
          </Stack>
        )}
      </Stack>

      {release && releaseUrl && (
        <Stack gap={1}>
          <Typography mb={0.5} variant="subtitle2">
            {t('publish.link')}
          </Typography>

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

      <Stack direction="row" gap={2} alignItems="center">
        <LoadingButton
          id="create-release-button"
          type="submit"
          loading={form.formState.isSubmitting}
          variant="contained"
          startIcon={<Box component={Icon} icon="tabler:rocket" sx={{ fontSize: 16 }} />}>
          {release ? t('publish.republishProject') : t('publish.publishProject')}
        </LoadingButton>
      </Stack>
    </Stack>
  );
}
