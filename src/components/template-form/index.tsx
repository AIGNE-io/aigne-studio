import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import RelativeTime from '@arcblock/ux/lib/RelativeTime';
import { ArrowDropDown } from '@mui/icons-material';
import { Box, Button, Grid, TextField, Typography } from '@mui/material';
import { WritableDraft } from 'immer/dist/internal';
import { ComponentProps } from 'react';
import { useAsync } from 'react-use';

import { Template } from '../../../api/src/store/templates';
import { Commit, getLogs } from '../../libs/log';
import { getFile } from '../../libs/tree';
import useDialog from '../../utils/use-dialog';
import Branches from './branches';
import CommitSelect from './commit-select';
import CommitsTip from './commits-tip';
import Parameters from './parameters';
import Prompts from './prompts';

export default function TemplateFormView({
  projectId,
  _ref: ref,
  path,
  hash,
  value: form,
  onCommitSelect,
  onChange,
  onTemplateClick,
}: {
  projectId: string;
  _ref: string;
  path: string;
  hash?: string;
  value: Template;
  onCommitSelect: (commit: Commit) => any;
  onChange: (update: Template | ((update: WritableDraft<Template>) => void)) => void;
  onTemplateClick?: (template: { id: string }) => void;
}) {
  const { t, locale } = useLocaleContext();

  const { dialog, showDialog, closeDialog } = useDialog();

  return (
    <Grid container spacing={2}>
      {dialog}

      <Grid item xs={12}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography color="text.secondary" component="span">
            {t('alert.updatedAt')}:
          </Typography>

          <Commits
            key={form.updatedAt}
            projectId={projectId}
            _ref={ref}
            path={path}
            hash={hash}
            onCommitSelect={onCommitSelect}>
            <Button
              sx={{ ml: 1 }}
              color="inherit"
              endIcon={<ArrowDropDown fontSize="small" sx={{ color: 'text.secondary' }} />}>
              <RelativeTime locale={locale} value={form.updatedAt} />
            </Button>
          </Commits>

          <Box flex={1} />

          <Button
            onClick={() =>
              showDialog({
                maxWidth: 'sm',
                fullWidth: true,
                title: t('alert.pickFromBranch'),
                content: (
                  <CommitSelect
                    projectId={projectId}
                    _ref={ref}
                    path={path}
                    onSelect={async (commit) => {
                      const template = await getFile({ projectId, ref: commit.oid, path });
                      onChange(template);
                      closeDialog();
                    }}
                  />
                ),
                cancelText: t('alert.cancel'),
              })
            }>
            {t('alert.pickFromBranch')}
          </Button>
        </Box>
      </Grid>

      <Grid item xs={12}>
        <TextField
          variant="filled"
          InputProps={{ disableUnderline: true, sx: { borderRadius: 1 } }}
          fullWidth
          label={t('form.versionNote')}
          size="small"
          value={form.versionNote ?? ''}
          onChange={(e) => onChange((form) => (form.versionNote = e.target.value))}
        />
      </Grid>

      <Grid item xs={12}>
        <TextField
          variant="filled"
          InputProps={{ disableUnderline: true, sx: { borderRadius: 1 } }}
          fullWidth
          label={t('form.name')}
          size="small"
          value={form.name ?? ''}
          onChange={(e) => onChange((form) => (form.name = e.target.value))}
        />
      </Grid>

      <Grid item xs={12}>
        <Typography variant="h6" fontWeight="bold" sx={{ my: 2 }}>
          Messages
        </Typography>

        <Prompts value={form} onChange={onChange} />
      </Grid>

      {form.type === 'branch' && (
        <Grid item xs={12}>
          <Typography variant="h6" fontWeight="bold" sx={{ my: 2 }}>
            Branches
          </Typography>

          <Branches projectId={projectId} value={form} onChange={onChange} onTemplateClick={onTemplateClick} />
        </Grid>
      )}

      <Grid item xs={12}>
        <Typography variant="h6" fontWeight="bold" sx={{ my: 2 }}>
          Variables
        </Typography>

        <Parameters value={form} onChange={onChange} />
      </Grid>
    </Grid>
  );
}

function Commits({
  projectId,
  _ref: ref,
  path,
  ...props
}: {
  projectId: string;
  _ref: string;
  path?: string;
} & Omit<ComponentProps<typeof CommitsTip>, 'commits' | 'loading'>) {
  const { value, loading, error } = useAsync(() => getLogs({ projectId, ref, path }), [path]);
  if (error) console.error(error);

  return <CommitsTip {...props} loading={loading} commits={value?.commits} />;
}
