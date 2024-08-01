import { useCurrentProject } from '@app/contexts/project';
import { useProjectStore } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { AssistantYjs } from '@blocklet/ai-runtime/types';
import { Icon } from '@iconify-icon/react';
import ChevronDown from '@iconify-icons/tabler/chevron-down';
import { Accordion, AccordionDetails, AccordionSummary, Box, Typography } from '@mui/material';

import { CacheSettings } from './CacheSettings';
import { CronSettings } from './CronSettings';

export function AgentSettings({ agent }: { agent: AssistantYjs }) {
  const { t } = useLocaleContext();
  const { projectId, projectRef } = useCurrentProject();
  const { cronConfig } = useProjectStore(projectId, projectRef);

  const jobs = cronConfig.jobs?.filter((i) => i.agentId === agent.id);

  const list = [
    { title: t('cache'), detail: <CacheSettings agent={agent} />, defaultExpanded: agent.cache?.enable },
    { title: t('cronJobs'), detail: <CronSettings agent={agent} />, defaultExpanded: !!jobs && jobs.length > 0 },
  ];

  return (
    <Box>
      {list.map((item) => (
        <Accordion
          key={item.title}
          defaultExpanded={item.defaultExpanded}
          disableGutters
          elevation={0}
          sx={{ bgcolor: 'transparent' }}>
          <AccordionSummary expandIcon={<Icon icon={ChevronDown} />}>
            <Typography>{item.title}</Typography>
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
