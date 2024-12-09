import { usePromptAgents } from '@app/pages/project/yjs-state';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Tab, Tabs } from '@mui/material';

import { useSelectAgentContext } from '../select-agent-context';

const SelectAgentTabs = () => {
  const { t } = useLocaleContext();
  const { tab, setTab, currentAgent } = useSelectAgentContext();
  const restPromptAgents = usePromptAgents().filter((i) => i.id !== currentAgent.id);
  const tags = Array.from(new Set(restPromptAgents.flatMap((i) => i.tags ?? [])));

  return (
    <Tabs
      variant="scrollable"
      scrollButtons="auto"
      value={tab}
      onChange={(_, tab) => setTab(tab)}
      TabIndicatorProps={{ sx: { backgroundColor: '#030712' } }}
      sx={{
        minHeight: '44px',
        borderBottom: '1px solid',
        borderColor: 'grey.200',
        '.MuiTabs-flexContainer': { gap: 2 },
        '.MuiTab-root.Mui-selected': { color: '#030712' },
        '.MuiTab-root': {
          px: 0.5,
          lineHeight: '18px',
          minHeight: 'auto',
          fontSize: 14,
          fontWeight: 500,
          textTransform: 'none',
          minWidth: 'auto',
          color: '#4B5563',
        },
        '.MuiTabs-indicator': { bottom: 'auto', height: '1px' },
      }}>
      <Tab label={t('all')} value="all" />
      <Tab label={t('currentProject')} value="currentProject" />
      {tags.map((tag) => (
        <Tab key={tag} label={tag} value={tag} />
      ))}
    </Tabs>
  );
};

export default SelectAgentTabs;
