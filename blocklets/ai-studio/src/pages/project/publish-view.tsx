import LoadingButton from '@app/components/loading/loading-button';
import LogoField from '@app/components/publish/LogoField';
import PublishEntries from '@app/components/publish/PublishEntries';
import NumberField from '@app/components/template-form/number-field';
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
  FormHelperText,
  FormLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { styled as muiStyled } from '@mui/material/styles';
import { Suspense, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import QRCode from 'react-qr-code';
import { joinURL, withQuery } from 'ufo';

import BaseInput from '../../components/custom/input';
import Switch from '../../components/custom/switch';
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

  const {
    state: { releases, project },
    refetch,
  } = useProjectState(projectId, projectRef);

  const release = releases?.find((i) => i.projectRef === projectRef && i.assistantId === assistant.id);

  const releaseUrl = useMemo(() => {
    if (!release) return undefined;
    const pagesPrefix = blocklet?.componentMountPoints.find((i) => i.name === 'pages-kit')?.mountPoint || '/';
    // FIXME: change path to `/ai/chat`
    return withQuery(
      joinURL(globalThis.location.origin, pagesPrefix, `@${AI_RUNTIME_COMPONENT_DID}`, '/ai/chat/debug'),
      {
        assistantId: btoa([projectId, projectRef, assistant.id].join('/')),
      }
    );
  }, [release]);

  useEffect(() => {
    const name = assistant?.name ?? project?.name;
    const description = assistant?.description ?? project?.description;
    if (name || description) {
      setRelease((release) => {
        release.title ??= name;
        release.description ??= description;
      });
    }
  }, [project]);

  const defaultValues = useMemo(() => {
    return JSON.parse(JSON.stringify(assistant.release)) ?? {};
  }, [assistant.release]);

  const form = useForm<Pick<NonNullable<typeof assistant.release>, 'payment'>>({
    defaultValues,
  });

  const price = form.watch('payment.price');

  useEffect(() => {
    setRelease((release) => {
      release.payment ??= {};
      release.payment.price = price;
    });
  }, [price]);

  const onSubmit: Parameters<(typeof form)['handleSubmit']>[0] = async () => {
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
        Toast.success(t('publishSuccess'));
      } else {
        await updateRelease(release.id, {
          paymentEnabled,
          paymentUnitAmount,
        });
        await refetch({ force: true });
        Toast.success(t('publishUpdateSuccess'));
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
    <Stack
      px={2}
      mt={1}
      py={1}
      pb={2}
      gap={2}
      ml={1}
      overflow="auto"
      component="form"
      onSubmit={form.handleSubmit(onSubmit)}>
      <FormControl>
        <Typography variant="subtitle2" mb={0.5}>
          {t('designTemplate')}
        </Typography>

        <RadioGroup
          row
          sx={{ rowGap: 1 }}
          value={assistant.release?.template || 'chat'}
          onChange={(_, value) => setRelease((release) => (release.template = value))}>
          <StyledFormControlLabel
            labelPlacement="top"
            control={<Radio />}
            value="chat"
            label={<TemplateImage src={joinURL(window?.blocklet?.prefix ?? '/', '/images/template-1.png')} alt="" />}
          />
          <StyledFormControlLabel
            labelPlacement="top"
            control={<Radio />}
            value="form"
            label={<TemplateImage src={joinURL(window?.blocklet?.prefix ?? '/', '/images/template-2.png')} alt="" />}
          />
        </RadioGroup>
      </FormControl>

      <LogoField assistant={assistant} setRelease={setRelease} />

      <FormControl>
        <Typography mb={0.5} variant="subtitle2">
          {t('agentName')}
        </Typography>
        <BaseInput
          placeholder={t('agentNamePlaceholder')}
          value={assistant.release?.title || ''}
          onChange={(e) => setRelease((release) => (release.title = e.target.value))}
        />
      </FormControl>

      <FormControl>
        <Typography mb={0.5} variant="subtitle2">
          {t('agentDescription')}
        </Typography>
        <BaseInput
          multiline
          sx={{ padding: 0 }}
          placeholder={t('agentDescriptionPlaceholder')}
          minRows={3}
          value={assistant.release?.description || ''}
          onChange={(e) => setRelease((release) => (release.description = e.target.value))}
        />
      </FormControl>

      <PublishEntries assistant={assistant} />

      <FormControl>
        <Typography mb={0.5} variant="subtitle2">
          {t('openingText')}
        </Typography>
        <BaseInput
          multiline
          sx={{ padding: 0 }}
          placeholder={t('openingTextPlaceholder')}
          minRows={3}
          value={assistant.release?.openerMessage || ''}
          onChange={(e) => setRelease((release) => (release.openerMessage = e.target.value))}
        />
      </FormControl>

      <TableLayout component="table">
        <tr>
          <td colSpan={2}>
            <Typography variant="subtitle2" noWrap sx={{ mb: 0, mt: 1 }}>
              {t('chatButton')}
            </Typography>
          </td>
        </tr>

        <tr>
          <td>
            <FormLabel>{t('buttonTitle')}</FormLabel>
          </td>

          <td>
            <BaseInput
              fullWidth
              value={assistant.release?.submitButton?.title || ''}
              onChange={(e) =>
                setRelease((release) => {
                  release.submitButton ??= {};
                  release.submitButton.title = e.target.value;
                })
              }
            />
          </td>
        </tr>

        <tr>
          <td colSpan={2}>
            <Typography variant="subtitle2" sx={{ mb: 0, mt: 1 }}>
              {t('chatLimit')}
            </Typography>
          </td>
        </tr>

        <tr>
          <td>
            <FormLabel>{t('maxChatRoundLimit')}</FormLabel>
          </td>

          <td>
            <NumberField
              id="maxChatRoundLimit"
              fullWidth
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
          </td>
        </tr>

        <tr>
          <Box component="td" sx={{ verticalAlign: 'top' }}>
            <FormLabel sx={{ mt: 1.25, display: 'block' }}>{t('reachMaxRoundLimitTip')}</FormLabel>
          </Box>

          <td>
            <BaseInput
              id="reachMaxRoundLimitTip"
              fullWidth
              multiline
              value={assistant.release?.reachMaxRoundLimitTip ?? ''}
              onChange={(e) =>
                setRelease((release) => {
                  release.reachMaxRoundLimitTip = e.target.value;
                })
              }
            />
          </td>
        </tr>

        <tr>
          <td colSpan={2}>
            <Typography mb={0.5} variant="subtitle2" mt={1}>
              {t('payment')}
            </Typography>
          </td>
        </tr>

        <tr>
          <td>
            <FormLabel>{t('enabled')}</FormLabel>
          </td>

          <td>
            <Switch
              checked={assistant.release?.payment?.enable || false}
              onChange={(_, checked) =>
                setRelease((release) => {
                  release.payment ??= {};
                  release.payment.enable = checked;
                })
              }
            />
          </td>
        </tr>

        {assistant.release?.payment?.enable && (
          <tr>
            <td>
              <FormLabel>{t('pricing')}</FormLabel>
            </td>

            <td>
              <Stack direction="row" alignItems="center" gap={1}>
                <BaseInput
                  fullWidth
                  {...form.register('payment.price', {
                    required: assistant.release.payment.enable ? t('pricingRequiredMessage') : undefined,
                    pattern: {
                      value: /^\d+(\.\d{1,5})?$/,
                      message: t('pricingPatternMessage', { decimal: 5 }),
                    },
                    min: { value: 0.00001, message: t('pricingPatternMessage', { decimal: 5 }) },
                    max: { value: 1000000, message: t('pricingInvalidMessage') },
                  })}
                />
                <Typography component="span">{t('pricingUnit')}</Typography>
              </Stack>
              {form.formState.errors.payment?.price?.message && (
                <FormHelperText error>{form.formState.errors.payment?.price?.message}</FormHelperText>
              )}
            </td>
          </tr>
        )}
      </TableLayout>

      {release && releaseUrl && (
        <Stack>
          <Typography variant="subtitle2">{t('publishedLink')}</Typography>

          <Link href={releaseUrl} target="_blank" sx={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
            <Typography component="span" sx={{ textOverflow: 'ellipsis', overflow: 'hidden', flexShrink: 1 }}>
              {releaseUrl}
            </Typography>

            <LaunchRounded sx={{ color: 'text.secondary', fontSize: 16 }} />
          </Link>

          <Box component={QRCode} value={releaseUrl} sx={{ width: 120, height: 120, mt: 1 }} />

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
          loadingPosition="start"
          startIcon={<Box component={Icon} icon="tabler:rocket" sx={{ fontSize: 16 }} />}>
          {release ? t('publishUpdate') : t('publish')}
        </LoadingButton>
      </Stack>
    </Stack>
  );
}

const TableLayout = styled(Box)`
  td {
    white-space: nowrap;

    &:first-of-type {
      padding-right: 16px;
    }

    &:last-of-type {
      width: 100%;
    }
  }
`;
