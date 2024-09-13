import LoadingButton from '@app/components/loading/loading-button';
import { useIsAdmin } from '@app/contexts/session';
import UploaderProvider, { useUploader } from '@app/contexts/uploader';
import { Category, getCategories } from '@app/libs/category';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import LockIcon from '@iconify-icons/tabler/lock';
import View360 from '@iconify-icons/tabler/view-360';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import { useRequest } from 'ahooks';
import { PopupState, bindDialog } from 'material-ui-popup-state/hooks';
import { useEffect, useState } from 'react';
import { Control, Controller, useForm } from 'react-hook-form';

import { updateDeployment } from '../../libs/deployment';
import Close from '../project/icons/close';

type UpdateType = {
  access: 'private' | 'public';
  categories: string[];
  banner: string;
};

export default function DeploymentDialog({
  dialogState,
  id,
  access,
  categories,
  banner = '',
  showCategories = true,
  showBanner = true,
  run,
}: {
  dialogState: PopupState;
  id: string;
  access: 'private' | 'public';
  categories: string[];
  banner: string;
  run: () => void;
  showCategories?: boolean;
  showBanner?: boolean;
}) {
  const isAdmin = useIsAdmin();
  const { t } = useLocaleContext();

  const { control, handleSubmit, setValue } = useForm<UpdateType>({ defaultValues: { access, categories } });
  const { data, loading: categoriesLoading } = useRequest(getCategories, {
    defaultParams: [{ page: 1, pageSize: 1000 }],
    refreshDeps: [],
  });

  useEffect(() => {
    setValue('categories', categories);
    setValue('access', access);
    setValue('banner', banner);
  }, [access, categories, banner, setValue]);

  const onSubmit = async (data: UpdateType) => {
    try {
      await updateDeployment(id, data);
      dialogState.close();
      run();
      Toast.success(t('updateSuccess'));
    } catch (error) {
      Toast.error(error.message);
    }
  };

  return (
    <UploaderProvider>
      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={(e) => e.preventDefault()}>
        <DialogTitle className="between">
          <Box>{t('deployments.updateApp')}</Box>
          <IconButton size="small" onClick={dialogState.close}>
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {categoriesLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height={400}>
              <CircularProgress />
            </Box>
          ) : (
            <Stack gap={1}>
              <Stack gap={1}>
                <Typography variant="body1">{t('deployments.visibility')}</Typography>
                <Card sx={{ width: 1, boxShadow: 0 }}>
                  <CardContent sx={{ p: 0, m: 0 }}>
                    <VisibilitySelect control={control} name="access" />
                  </CardContent>

                  {!isAdmin && (
                    <Typography variant="caption" mt={2}>
                      {t('deployments.toEnablePrivateProjects')}
                      <Box
                        component="a"
                        href="https://store.blocklet.dev/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB"
                        target="_blank">
                        {t('deployments.launchAigne')}
                      </Box>
                    </Typography>
                  )}
                </Card>
              </Stack>

              {showCategories && (
                <Stack gap={1}>
                  <Typography variant="body1">{t('category.title')}</Typography>
                  <CategorySelect control={control} name="categories" categories={data?.list || []} />
                </Stack>
              )}

              {showBanner && (
                <Stack gap={1}>
                  <Typography variant="body1">{t('deployments.banner')}</Typography>
                  <BannerSelect control={control} name="banner" />
                </Stack>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Stack flexDirection="row" gap={1}>
            <Button variant="outlined" onClick={dialogState.close}>
              {t('cancel')}
            </Button>
            <LoadingButton variant="contained" onClick={handleSubmit(onSubmit)}>
              {t('update')}
            </LoadingButton>
          </Stack>
        </DialogActions>
      </Dialog>
    </UploaderProvider>
  );
}

function VisibilitySelect({ control, name }: { control: Control<UpdateType>; name: 'access' }) {
  const isAdmin = useIsAdmin();
  const { t } = useLocaleContext();

  return (
    <Controller
      name={name}
      control={control}
      defaultValue="public"
      render={({ field }) => (
        <FormControl component="fieldset">
          <RadioGroup {...field}>
            <FormControlLabel
              sx={{ m: 0 }}
              value="public"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center">
                  <Box component={Icon} icon={View360} sx={{ mr: 1, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body1">{t('public')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('deployments.publicDescription')}
                    </Typography>
                  </Box>
                </Box>
              }
            />
            <FormControlLabel
              disabled={!isAdmin}
              sx={{ m: 0, mt: 1 }}
              value="private"
              control={<Radio />}
              label={
                <Box display="flex" alignItems="center">
                  <Box component={Icon} icon={LockIcon} sx={{ mr: 1, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body1">{t('private')}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('deployments.privateDescription')}
                    </Typography>
                  </Box>
                </Box>
              }
            />
          </RadioGroup>
        </FormControl>
      )}
    />
  );
}

function CategorySelect({
  control,
  name,
  categories,
}: {
  control: Control<UpdateType>;
  name: 'categories';
  categories: Category[];
}) {
  const [open, setOpen] = useState(false);
  const loading = open && categories.length === 0;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value } }) => (
        <Autocomplete
          multiple
          sx={{ width: 1 }}
          open={open}
          onOpen={() => setOpen(true)}
          onClose={() => setOpen(false)}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          getOptionLabel={(option) => {
            if (typeof option === 'string') {
              const category = categories.find((film) => film.id === option);
              return category ? category.name : '';
            }

            return option.name;
          }}
          options={categories}
          loading={loading}
          value={value.map((id) => categories.find((cat) => cat.id === id) || { id, name: '' })}
          onChange={(_event, newValue) => {
            onChange(newValue.map((item) => (typeof item === 'string' ? item : item.id)));
          }}
          renderTags={(value, getTagProps) =>
            value.map((item, index) => {
              const category = categories.find((film) => film?.id === item.id);
              return <Chip variant="outlined" label={category ? category.name : ''} {...getTagProps({ index })} />;
            })
          }
          renderInput={(params) => (
            <TextField
              {...params}
              hiddenLabel
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      )}
    />
  );
}

function BannerSelect({ control, name }: { control: Control<UpdateType>; name: 'banner' }) {
  const uploaderRef = useUploader();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Box sx={{ width: 1, position: 'relative', pb: '40%' }}>
          <Box
            sx={{ position: 'absolute', inset: 0 }}
            onClick={() => {
              const uploader = uploaderRef?.current?.getUploader();
              uploader?.open();

              uploader.onceUploadSuccess(({ response }: any) => {
                const url = response?.data?.url || response?.data?.fileUrl;
                field.onChange(url);
              });
            }}>
            {field.value ? (
              <Box
                component="img"
                src={field.value}
                sx={{
                  position: 'absolute',
                  inset: 0,
                  cursor: 'pointer',
                  objectFit: 'cover',
                  width: 1,
                  height: 1,
                  borderRadius: 1,
                }}
              />
            ) : (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  cursor: 'pointer',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backgroundSize: 'cover',
                  borderRadius: 1,
                }}
              />
            )}
          </Box>
        </Box>
      )}
    />
  );
}
