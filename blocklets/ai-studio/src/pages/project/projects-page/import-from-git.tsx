import currentGitStore from '@app/store/current-git-store';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
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
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { cloneElement, useCallback, useId, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { joinURL } from 'ufo';

import { useProjectsState } from '../../../contexts/projects';
import { getErrorMessage } from '../../../libs/api';
import Add from '../icons/add';
import Close from '../icons/close';
import Eye from '../icons/eye';
import EyeNo from '../icons/eye-no';

interface RemoteRepoSettingForm {
  url: string;
  description: string;
  username: string;
  password: string;
  name: string;
}

export default function ImportFromGit({ children }: { children: any }) {
  const { t } = useLocaleContext();
  const id = useId();
  const navigate = useNavigate();
  const dialogState = usePopupState({ variant: 'dialog', popupId: id });
  const [showPassword, setShowPassword] = useState(false);
  const { importProject } = useProjectsState();

  const form = useForm<RemoteRepoSettingForm>({
    defaultValues: {
      url: '',
      description: '',
      password: '',
      name: '',
    },
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

        currentGitStore.setState({ currentProjectId: project._id });

        dialogState.close();
        navigate(joinURL('/projects', project._id!));
      } catch (error) {
        form.reset(value);
        Toast.error(getErrorMessage(error));
        throw error;
      }
    },
    [dialogState, form, importProject, navigate]
  );

  return (
    <>
      {cloneElement(children, { onClick: () => dialogState.open() })}

      <Dialog
        {...bindDialog(dialogState)}
        maxWidth="sm"
        fullWidth
        component="form"
        onSubmit={form.handleSubmit(saveSetting)}>
        <DialogTitle className="between">
          <Box>{t('remoteGitRepo')}</Box>

          <IconButton size="small" onClick={() => dialogState.close()}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Stack gap={1.5}>
            <Box>
              <Typography variant="subtitle2">{`${t('url')}*`}</Typography>
              <TextField
                autoFocus
                fullWidth
                label={`${t('url')}*`}
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
                InputProps={{
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                }}
                InputLabelProps={{ shrink: form.watch('url') ? true : undefined }}
                error={Boolean(form.formState.errors.url)}
                helperText={form.formState.errors.url?.message}
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('username')}</Typography>
              <TextField
                fullWidth
                label={t('username')}
                {...form.register('username')}
                error={Boolean(form.formState.errors.username)}
                helperText={form.formState.errors.username?.message}
                InputLabelProps={{ shrink: form.watch('username') ? true : undefined }}
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('projectSetting.name')}</Typography>
              <TextField
                label={t('projectSetting.name')}
                {...form.register('name')}
                InputProps={{
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                }}
                InputLabelProps={{ shrink: form.watch('name') ? true : undefined }}
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
            </Box>

            <Box>
              <Typography variant="subtitle2">{t('projectSetting.description')}</Typography>
              <TextField
                label={t('projectSetting.description')}
                multiline
                rows={4}
                {...form.register('description')}
                InputProps={{
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                }}
                sx={{ width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' }}
              />
            </Box>

            <Box>
              <Box variant="subtitle2">{t('accessToken')}</Box>
              <TextField
                fullWidth
                label={t('accessToken')}
                {...form.register('password')}
                autoComplete="false"
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
                InputLabelProps={{ shrink: form.watch('password') ? true : undefined }}
                InputProps={{
                  readOnly: true,
                  onFocus: (e) => (e.currentTarget.readOnly = false),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <EyeNo /> : <Eye />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ '.MuiInputBase-root': { width: 1, border: '1px solid #E5E7EB', borderRadius: '8px' } }}
              />
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={dialogState.close} className="cancel">
            {t('cancel')}
          </Button>
          <LoadingButton
            className="save"
            variant="contained"
            type="submit"
            loading={form.formState.isSubmitting}
            loadingPosition="start"
            startIcon={<Add />}>
            {t('import.remote')}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </>
  );
}
