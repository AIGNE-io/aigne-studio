import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Alert, Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useState } from 'react';
import { useAsync } from 'react-use';

import type { Commit } from '../../libs/log';
import { getLogs } from '../../libs/log';
import { useProjectState } from '../../pages/project/state';
import { CommitListView } from './commits-tip';

export default function CommitSelect({
  projectId,
  _ref: ref,
  path,
  onSelect,
}: {
  projectId: string;
  _ref: string;
  path: string;
  onSelect: (commit: Commit) => any;
}) {
  const { t } = useLocaleContext();

  const { state } = useProjectState(projectId, ref);

  const [branch, setBranch] = useState('main');

  const { value, loading, error } = useAsync(
    () => getLogs({ projectId, ref: branch, path }),
    [projectId, branch, path]
  );

  return (
    <Box height="50vh" overflow="auto">
      <Box sx={{ mb: 2, position: 'sticky', top: 0, pt: 1, zIndex: 1, bgcolor: 'background.paper' }}>
        <FormControl fullWidth>
          <InputLabel>{t('branch')}</InputLabel>
          <Select label={t('branch')} value={branch} onChange={(e) => setBranch(e.target.value)}>
            {state.branches.map((branch) => (
              <MenuItem key={branch} value={branch}>
                {branch}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {error && <Alert color="error">{error.message}</Alert>}

      <CommitListView loading={loading} commits={value?.commits} onClick={(commit) => onSelect(commit)} />
    </Box>
  );
}
