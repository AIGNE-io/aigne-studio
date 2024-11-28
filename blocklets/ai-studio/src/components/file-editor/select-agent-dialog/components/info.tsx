import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Avatar, Box } from '@mui/material';
import dayjs from 'dayjs';

import { SelectAgent } from '../select-agent-context';
import SelectAgentBadge from './badge';
import SelectAgentLogo from './logo';

const Info = ({ agent }: { agent: SelectAgent }) => {
  const { t } = useLocaleContext();

  const avatar =
    typeof agent?.createdByInfo?.avatar === 'string' ? (
      <Avatar src={agent?.createdByInfo?.avatar} sx={{ width: 16, height: 16 }} />
    ) : (
      agent?.createdByInfo?.avatar
    );

  const updatedAt = agent?.createdByInfo?.updatedAt
    ? dayjs(agent?.createdByInfo?.updatedAt).format('YYYY-MM-DD')
    : null;

  const { input, output } = agent;

  return (
    <>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        <SelectAgentLogo logo={agent.logo} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            className="multi-line-ellipsis"
            sx={{
              color: '#030712',
              fontSize: 16,
              fontWeight: 600,
              WebkitLineClamp: 2,
              overflowWrap: 'break-word',
            }}
            title={agent?.name}>
            {agent?.name}
          </Box>
          <Box
            className="multi-line-ellipsis"
            sx={{
              mt: 0.5,
              fontSize: 12,
              color: '#4B5563',
              WebkitLineClamp: 3,
              overflowWrap: 'break-word',
            }}
            title={agent?.description}>
            {agent?.description}
          </Box>
        </Box>
      </Box>
      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <SelectAgentBadge
            name={t('input')}
            schema={input}
            bgcolor="#D1FAE5"
            fontColor="#047857"
            borderColor="#A7F3D0"
          />
          <SelectAgentBadge
            name={t('output')}
            schema={output}
            bgcolor="#DBEAFE"
            fontColor="#1D4ED8"
            borderColor="#BFDBFE"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', fontSize: 12, color: '#9CA3AF' }}>
          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
            {avatar}
            <Box>{agent?.createdByInfo?.name}</Box>
          </Box>
          <Box>{updatedAt}</Box>
        </Box>
      </Box>
    </>
  );
};

export default Info;
