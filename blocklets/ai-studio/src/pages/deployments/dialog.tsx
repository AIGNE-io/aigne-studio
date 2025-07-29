import LoadingButton from '@app/components/loading/loading-button';
import { useIsAdmin } from '@app/contexts/session';
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

import { UpdateType, adminUpdateDeployment } from '../../libs/deployment';
import Close from '../project/icons/close';

export default function DeploymentDialog({
  dialogState,
  id,
  access,
  categories = [],
  orderIndex,
  productHuntUrl,
  productHuntBannerUrl,
  showVisibility = true,
  run,
}: {
  dialogState: PopupState;
  id: string;
  access: 'private' | 'public';
  categories: { id: string; name: string; slug: string }[];
  orderIndex?: number;
  productHuntUrl?: string;
  productHuntBannerUrl?: string;
  run: () => void;
  showVisibility?: boolean;
}) {
  const isAdmin = useIsAdmin();
  const { t } = useLocaleContext();

  const { register, control, handleSubmit, setValue } = useForm<UpdateType>({
    defaultValues: {
      access,
      categories: categories.map((category) => category.id),
      productHuntUrl,
      productHuntBannerUrl,
      orderIndex,
    },
  });

  const { data, loading: categoriesLoading } = useRequest(getCategories, {
    defaultParams: [{ page: 1, pageSize: 1000 }],
    refreshDeps: [],
  });

  useEffect(() => {
    setValue('access', access);
    setValue(
      'categories',
      categories.map((category) => category.id)
    );
    setValue('productHuntUrl', productHuntUrl || '');
    setValue('productHuntBannerUrl', productHuntBannerUrl || '');
    setValue('orderIndex', orderIndex);
  }, [access, categories, productHuntUrl, productHuntBannerUrl, orderIndex, setValue]);

  const onSubmit = async (data: UpdateType) => {
    try {
      await adminUpdateDeployment(id, data);
      dialogState.close();
      run();
      Toast.success(t('updateSuccess'));
    } catch (error) {
      Toast.error(error.message);
    }
  };

  return (
    <Dialog {...bindDialog(dialogState)} fullWidth maxWidth="sm" component="form" onSubmit={(e) => e.preventDefault()}>
      <DialogTitle className="between">
        <Box>{t('deployments.updateApp')}</Box>

        <IconButton size="small" onClick={dialogState.close}>
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent data-testid="deployment-dialog">
        {categoriesLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 400,
            }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack
            sx={{
              gap: 1,
            }}>
            {showVisibility && (
              <Stack
                sx={{
                  gap: 1,
                }}>
                <Typography variant="body1">{t('deployments.visibility')}</Typography>
                <Card sx={{ width: 1, boxShadow: 0 }}>
                  <CardContent sx={{ p: 0, m: 0 }}>
                    <VisibilitySelect control={control} name="access" />
                  </CardContent>

                  {!isAdmin && (
                    <Typography
                      variant="caption"
                      sx={{
                        mt: 2,
                      }}>
                      {t('deployments.toEnablePrivateProjects')}
                      <Box
                        component="a"
                        href="https://store.blocklet.dev/blocklets/z8iZpog7mcgcgBZzTiXJCWESvmnRrQmnd3XBB"
                        target="_blank"
                        sx={{ ml: 1 }}>
                        {t('deployments.launchAigne')}
                      </Box>
                    </Typography>
                  )}
                </Card>
              </Stack>
            )}

            <Stack
              sx={{
                gap: 1,
              }}>
              <Typography variant="body1">{t('category.title')}</Typography>
              <CategorySelect control={control} name="categories" categories={data?.list || []} />
            </Stack>

            <Stack
              sx={{
                gap: 1,
              }}>
              <Typography variant="body1">Order Index (ASC)</Typography>
              <TextField
                {...register('orderIndex', { valueAsNumber: true })}
                hiddenLabel
                fullWidth
                type="number"
                placeholder="Order Index"
              />
            </Stack>

            <ProductHuntFields control={control} />
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Stack
          sx={{
            flexDirection: 'row',
            gap: 1,
          }}>
          <Button variant="outlined" onClick={dialogState.close}>
            {t('cancel')}
          </Button>
          <LoadingButton variant="contained" onClick={handleSubmit(onSubmit)} data-testid="update-button">
            {t('update')}
          </LoadingButton>
        </Stack>
      </DialogActions>
    </Dialog>
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                  <Box component={Icon} icon={View360} sx={{ mr: 1, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body1">{t('public')}</Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                      }}>
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
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                  <Box component={Icon} icon={LockIcon} sx={{ mr: 1, fontSize: 20 }} />
                  <Box>
                    <Typography variant="body1">{t('private')}</Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'text.secondary',
                      }}>
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
          value={value?.map((id) => categories.find((cat) => cat.id === id) || { id, name: '' })}
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
              data-testid="category-select-input"
              {...params}
              hiddenLabel
              slotProps={{
                input: {
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {/* {loading ? <CircularProgress color="inherit" size={20} /> : null} */}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                },
              }}
            />
          )}
        />
      )}
    />
  );
}

function ProductHuntFields({ control }: { control: Control<UpdateType> }) {
  const { t } = useLocaleContext();

  return (
    <Stack
      sx={{
        gap: 1,
      }}>
      <Typography variant="body1">{t('deployments.productHunt')}</Typography>
      <Controller
        name="productHuntUrl"
        control={control}
        defaultValue=""
        rules={{ pattern: /^https?:\/\/.+/ }}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            label={t('deployments.productHuntUrl')}
            fullWidth
            error={!!error}
            helperText={error ? t('deployments.invalidUrl') : ''}
          />
        )}
      />
      <Controller
        name="productHuntBannerUrl"
        control={control}
        defaultValue=""
        rules={{ pattern: /^https?:\/\/.+/ }}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            label={t('deployments.productHuntBannerUrl')}
            fullWidth
            error={!!error}
            helperText={error ? t('deployments.invalidUrl') : ''}
          />
        )}
      />
    </Stack>
  );
}
