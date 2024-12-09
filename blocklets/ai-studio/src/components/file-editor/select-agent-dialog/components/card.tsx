import { Box, Drawer, Theme, useMediaQuery } from '@mui/material';
import { useMemo, useState } from 'react';

import { SelectAgent, useSelectAgentContext } from '../select-agent-context';
import Info from './info';
import SelectAgentLogo from './logo';

const SelectAgentCard = ({ agent }: { agent: SelectAgent }) => {
  const downMd = useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
  const { id, name, description, logo } = agent;
  const { selectedAgent, setSelectedAgent } = useSelectAgentContext();
  const isSelected = useMemo(() => selectedAgent?.id === id, [selectedAgent, id]);

  const scrollIntoView = () => {
    const el = document.getElementById(`select-agent-card-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const [prevSelectedAgent, setPrevSelectedAgent] = useState(selectedAgent);

  if (!prevSelectedAgent && selectedAgent) {
    setPrevSelectedAgent(selectedAgent);
    if (isSelected) setTimeout(scrollIntoView, 100);
  }

  const [open, setOpen] = useState(false);

  const onCardClick = () => {
    setSelectedAgent(agent);
    setOpen(true);
  };

  return (
    <>
      <Box
        id={`select-agent-card-${id}`}
        onClick={() => onCardClick()}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          p: 2,
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 1,
          cursor: 'pointer',
          ':hover': {
            bgcolor: 'action.hover',
          },
          ...(isSelected && {
            borderColor: 'primary.main',
            bgcolor: 'action.selected',
          }),
        }}>
        <SelectAgentLogo logo={logo} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box className="ellipsis" sx={{ height: 24, color: '#030712', fontSize: 16, fontWeight: 600 }} title={name}>
            {name}
          </Box>
          <Box
            className="multi-line-ellipsis"
            sx={{
              mt: 0.5,
              height: 36,
              fontSize: 12,
              color: '#4B5563',
              WebkitLineClamp: 2,
              overflowWrap: 'break-word',
            }}
            title={description}>
            {description}
          </Box>
        </Box>
      </Box>
      {downMd && (
        <Drawer anchor="right" sx={{ zIndex: 1500 }} open={open} onClose={() => setOpen(false)}>
          <Box sx={{ p: 2, width: '90vw', maxWidth: '430px' }}>
            <Info agent={agent} />
          </Box>
        </Drawer>
      )}
    </>
  );
};

export default SelectAgentCard;
