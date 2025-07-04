import { checkErrorType } from '@app/libs/util';
import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { RuntimeErrorType } from '@blocklet/ai-runtime/types/runtime/error';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import { LoadingButton } from '@mui/lab';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Link,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import gitUrlParse from 'git-url-parse';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import Close from '../icons/close';
import Eye from '../icons/eye';
import EyeNo from '../icons/eye-no';
import NameField from './components/name-field';

interface RemoteRepoSettingForm {
  url: string;
  description: string;
  username: string;
  password: string;
  name: string;
}

export default function ImportFromGit({ onClose }: { onClose: () => void }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const { importProject, createLimitDialog } = useProjectsState();

  const form = useForm<RemoteRepoSettingForm>({
    defaultValues: { url: '', description: '', password: '', name: '' },
  });

  const saveSetting = useCallback(
    async (value: RemoteRepoSettingForm) => {
      try {
        const project = await importProject({
          name: value.name,
          description: value.description,
          url: value.url,
          username: value.username,
          password: value.password,
        });
        form.reset(value);

        currentGitStore.setState({ currentProjectId: project.id });

        onClose();
        navigate(joinURL('/projects', project.id!));
      } catch (error) {
        form.reset(value);
        const message = getErrorMessage(error);
        if (checkErrorType(error, RuntimeErrorType.ProjectLimitExceededError)) {
          createLimitDialog();
        } else {
          Toast.error(message);
        }
        throw error;
      }
    },
    [form, navigate]
  );

  return (
    <Dialog open maxWidth="sm" fullWidth component="form" onSubmit={form.handleSubmit(saveSetting)} onClose={onClose}>
      <DialogTitle className="between">
        <Box>{t('remoteGitRepo')}</Box>

        <IconButton size="small" onClick={() => onClose()}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Stack sx={{
          gap: 1.5
        }}>
          <Box>
            <Typography variant="subtitle2">{`${t('gitUrl')}*`}</Typography>
            <TextField
              hiddenLabel
              autoFocus
              fullWidth
              placeholder="https://github.com/aigne/example.git"
              onPaste={(e) => {
                try {
                  const url = gitUrlParse(e.clipboardData.getData('text/plain'));
                  const https = gitUrlParse.stringify(url, 'https');
                  form.setValue('url', https, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
                  form.setValue('username', url.owner, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true,
                  });
                  form.setValue('name', url.name, { shouldValidate: true, shouldDirty: true, shouldTouch: true });

                  const { password } = url as any;
                  if (password && typeof password === 'string') {
                    form.setValue('password', password, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true,
                    });
                  }
                  e.preventDefault();
                } catch {
                  // empty
                }
              }}
              {...form.register('url', {
                required: true,
                validate: (value) =>
                  /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/.test(
                    value
                  ) || t('validation.urlPattern'),
              })}
              error={Boolean(form.formState.errors.url)}
              helperText={form.formState.errors.url?.message}
              sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              slotProps={{
                input: {
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                },

                inputLabel: { shrink: form.watch('url') ? true : undefined }
              }} />
          </Box>

          <Box sx={{ display: 'none' }}>
            <Typography variant="subtitle2">{t('username')}</Typography>
            <TextField
              fullWidth
              label={t('username')}
              {...form.register('username')}
              error={Boolean(form.formState.errors.username)}
              helperText={form.formState.errors.username?.message}
              sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              slotProps={{
                inputLabel: { shrink: form.watch('username') ? true : undefined }
              }}
            />
          </Box>

          <Box>
            <Typography variant="subtitle2">{t('accessToken')}</Typography>
            <TextField
              hiddenLabel
              fullWidth
              {...form.register('password')}
              autoComplete="false"
              placeholder={t('importFromGitAccessTokenPlaceholder')}
              error={Boolean(form.formState.errors.password)}
              helperText={
                form.formState.errors.password?.message || (
                  <Box component="span">
                    {t('remoteGitRepoPasswordHelper')}{' '}
                    <Tooltip
                      title={t('githubTokenTip')}
                      placement="top"
                      slotProps={{ popper: { sx: { whiteSpace: 'pre-wrap' } } }}>
                      <Link href="https://github.com/settings/tokens?type=beta" target="_blank">
                        github access token
                      </Link>
                    </Tooltip>
                  </Box>
                )
              }
              type={showPassword ? 'text' : 'password'}
              sx={{ '.MuiInputBase-root': { width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' } }}
              slotProps={{
                input: {
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <EyeNo /> : <Eye />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },

                inputLabel: { shrink: form.watch('password') ? true : undefined }
              }} />
          </Box>

          <Box>
            <Typography variant="subtitle2">{t('name')}</Typography>
            <NameField form={form} beforeDuplicateProjectNavigate={() => onClose()} />
          </Box>

          <Box>
            <Typography variant="subtitle2">{t('description')}</Typography>
            <TextField
              hiddenLabel
              multiline
              minRows={2}
              maxRows={3}
              placeholder={t('newProjectDescriptionPlaceholder')}
              {...form.register('description')}
              sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              slotProps={{
                input: {
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                }
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          {t('cancel')}
        </Button>
        <LoadingButton
          variant="contained"
          type="submit"
          loading={form.formState.isSubmitting}
          loadingPosition="start"
          startIcon={<Box component={Icon} icon={PlusIcon} />}>
          {t('import.remote')}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
