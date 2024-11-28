import { Box } from '@mui/material';

import { SelectAgent } from '../select-agent-context';

const SelectAgentLogo = ({ logo }: { logo: SelectAgent['logo'] }) => {
  if (typeof logo === 'string') {
    return <Box component="img" src={logo} sx={{ borderRadius: 1 }} width={64} height={64} />;
  }
  return logo;
};

export default SelectAgentLogo;
