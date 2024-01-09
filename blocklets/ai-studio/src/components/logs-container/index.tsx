import { Clear, ExpandLess, ExpandMore } from '@mui/icons-material';
import { Box, IconButton, Paper, Toolbar, Typography } from '@mui/material';
import { memo, useState } from 'react';

import useLogsStore from './logs-store';

function DevToolsConsole() {
  const logs = useLogsStore((i) => i.logs);
  const clearLogs = useLogsStore((i) => i.clearLogs);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Paper
      sx={{
        position: 'relative',
        borderRadius: 0,
      }}>
      <Toolbar sx={{ minHeight: '0 !important', bgcolor: '#fff', py: 0.2, px: '8px !important' }}>
        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          Console
        </Typography>
        <IconButton size="small" onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
        <IconButton size="small" onClick={clearLogs}>
          <Clear fontSize="small" />
        </IconButton>
      </Toolbar>
      {isExpanded && (
        <Box sx={{ minHeight: 25, maxHeight: 200, px: 2, pb: 1, overflowY: 'scroll' }}>
          {logs.map((log, index) => (
            <Typography key={index}>{log.console}</Typography>
          ))}
        </Box>
      )}
    </Paper>
  );
}

export default memo(DevToolsConsole);
