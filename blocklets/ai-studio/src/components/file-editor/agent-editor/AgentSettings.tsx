import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ChevronDown from '@iconify-icons/tabler/chevron-down';
import { Accordion, AccordionDetails, AccordionSummary, Box, Stack, Typography, accordionClasses } from '@mui/material';

import { CacheSettings, CacheSettingsSummary } from './CacheSettings';
import { CronSettings, CronSettingsSummary } from './CronSettings';

export function AgentSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();

  const list = [
    {
      title: t('cache'),
      summary: <CacheSettingsSummary agent={agent} />,
      detail: <CacheSettings agent={agent} />,
    },
    {
      title: t('cronJobs'),
      summary: <CronSettingsSummary agent={agent} />,
      detail: <CronSettings agent={agent} />,
    },
  ];

  return (
    <Box>
      {list.map((item) => (
        <Accordion
          key={item.title}
          disableGutters
          elevation={0}
          sx={{
            bgcolor: 'transparent',
            ':before': { display: 'none' },
            [`+ .${accordionClasses.root}`]: { borderTop: 1, borderColor: 'divider' },
            '.hidden-expanded': { transition: (theme) => theme.transitions.create('all') },
            [`.${accordionClasses.expanded}`]: { '.hidden-expanded': { opacity: 0 } },
          }}
          onChange={(e, expanded) => {
            if (expanded) {
              setTimeout(
                () => {
                  (e.target as HTMLElement).parentElement?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest',
                  });
                },
                // waiting for accordion details expanded
                300
              );
            }
          }}>
          <AccordionSummary expandIcon={<Icon icon={ChevronDown} />}>
            <Stack direction="row" alignItems="baseline" gap={1}>
              <Typography>{item.title}</Typography>

              <Box className="hidden-expanded">{item.summary}</Box>
            </Stack>
          </AccordionSummary>

          <AccordionDetails>
            <Box bgcolor="background.paper" borderRadius={1}>
              {item.detail}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}
