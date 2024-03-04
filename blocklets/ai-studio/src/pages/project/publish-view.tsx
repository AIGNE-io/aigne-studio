import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Button, Checkbox, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { joinURL, withQuery } from 'ufo';

export default function PublishView({
  projectId,
  gitRef,
  assistant,
}: {
  projectId: string;
  gitRef: string;
  assistant: AssistantYjs;
}) {
  const { t } = useLocaleContext();
  const [withCollections, setWithCollections] = useState(false);

  return (
    <Stack>
      <Stack px={2} py={1} gap={1}>
        <Typography variant="subtitle1" ml={1}>
          {t('templates')}
        </Typography>

        <RadioGroup row>
          <FormControlLabel
            labelPlacement="top"
            control={<Radio />}
            label={
              <Stack
                width={60}
                height={80}
                bgcolor="background.default"
                borderRadius={1}
                alignItems="center"
                justifyContent="center">
                <Typography variant="caption" color="text.disabled">
                  Default
                </Typography>
              </Stack>
            }
          />
          <FormControlLabel
            disabled
            labelPlacement="top"
            control={<Radio />}
            label={
              <Stack
                width={60}
                height={80}
                bgcolor="background.default"
                borderRadius={1}
                alignItems="center"
                justifyContent="center"
              />
            }
          />
          <FormControlLabel
            disabled
            labelPlacement="top"
            control={<Radio />}
            label={
              <Stack
                width={60}
                height={80}
                bgcolor="background.default"
                borderRadius={1}
                alignItems="center"
                justifyContent="center"
              />
            }
          />
          <FormControlLabel
            disabled
            labelPlacement="top"
            control={<Radio />}
            label={
              <Stack
                width={60}
                height={80}
                bgcolor="background.default"
                borderRadius={1}
                alignItems="center"
                justifyContent="center"
              />
            }
          />
        </RadioGroup>
      </Stack>

      <Stack px={2} py={1} gap={1}>
        <Typography variant="subtitle1" ml={1}>
          {t('options')}
        </Typography>

        <FormControlLabel
          control={<Checkbox checked={withCollections} onChange={(_, checked) => setWithCollections(checked)} />}
          label={t('withCollectionManage')}
        />
      </Stack>

      <Stack direction="row" px={2} py={1}>
        <Button
          variant="contained"
          onClick={() => {
            const pagesPrefix = blocklet?.componentMountPoints.find((i) => i.name === 'pages-kit')?.mountPoint || '/';
            const url = withQuery(joinURL(pagesPrefix, withCollections ? '/collections' : '/ai/form'), {
              assistantId: `${projectId}/${gitRef}/${assistant.id}`,
            });
            window.open(url, '_blank');
          }}>
          {t('open')}
        </Button>
      </Stack>
    </Stack>
  );
}
