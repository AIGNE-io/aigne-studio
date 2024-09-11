import PromiseLoadingButton from '@app/components/promise-loading-button';
import { createCategory, deleteCategory, getCategories, updateCategory } from '@app/libs/category';
import Close from '@app/pages/project/icons/close';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import EditIcon from '@iconify-icons/tabler/edit';
import TrashIcon from '@iconify-icons/tabler/trash';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Stack,
  TextField,
  Typography,
  styled,
} from '@mui/material';
import useInfiniteScroll from 'ahooks/lib/useInfiniteScroll';
import { bindDialog, usePopupState } from 'material-ui-popup-state/hooks';
import { Controller, useForm, useWatch } from 'react-hook-form';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';

const StyledListItem = styled(ListItem)(() => ({
  borderRadius: '8px',
  marginBottom: '8px',
  backgroundColor: '#f5f5f5',
  '&:hover': {
    backgroundColor: '#e0e0e0',
  },
}));

function CategoryList() {
  const dialogState = usePopupState({ variant: 'dialog' });
  const { t } = useLocaleContext();
  const { dialog, showDialog } = useDialog();

  const { loadingRef, dataState } = useFetchCategories();
  const categories = dataState?.data?.list || [];

  const {
    setValue,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<{ id?: string; name: string; icon: string }>({
    defaultValues: {
      id: '',
      name: '',
      icon: '',
    },
  });

  const icon = useWatch({
    control,
    name: 'icon',
  });

  const onSubmit = async (data: { id?: string; name: string; icon: string }) => {
    const { id, name, icon } = data;
    const action = id ? 'update' : 'create';
    const actionData = { name, icon };

    try {
      if (id) {
        await updateCategory(id, actionData);
      } else {
        await createCategory(actionData);
      }

      Toast.success(`${action === 'update' ? '更新' : '创建'}成功`);
      dialogState.close();
      reset();
    } catch (error) {
      Toast.error(`${action === 'update' ? '更新' : '创建'}失败`);
      console.error(`Error ${action}ing category:`, error);
    }
  };

  return (
    <Container>
      <Box className="between" mt={2.5} mb={1.5}>
        <Box sx={{ fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#030712' }}>分类</Box>
        <Button variant="contained" color="primary" onClick={dialogState.open}>
          添加分类
        </Button>
      </Box>

      <>
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {categories.map((item) => {
            return (
              <StyledListItem key={item.id}>
                <ListItemIcon sx={{ minWidth: 0, mr: 1.5 }}>
                  {item.icon ? <Icon icon={item.icon} /> : <Icon icon="tabler:settings" />}
                </ListItemIcon>
                <ListItemText primary={item.name} />
                <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <IconButton
                    edge="end"
                    aria-label="edit"
                    onClick={() => {
                      setValue('id', item.id);
                      setValue('name', item.name);
                      setValue('icon', item.icon);
                      dialogState.open();
                    }}>
                    <Box component={Icon} icon={EditIcon} fontSize="small" />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => {
                      showDialog({
                        formSx: {
                          '.MuiDialogTitle-root': {
                            border: 0,
                          },
                          '.MuiDialogActions-root': {
                            border: 0,
                          },
                        },
                        maxWidth: 'sm',
                        fullWidth: true,
                        title: <Box sx={{ wordWrap: 'break-word' }}>{t('deployments.deleteTitle')}</Box>,
                        content: (
                          <Box>
                            <Typography fontWeight={500} fontSize={16} lineHeight="28px" color="#4B5563">
                              {t('deployments.deleteDescription')}
                            </Typography>
                          </Box>
                        ),
                        okText: t('alert.delete'),
                        okColor: 'error',
                        cancelText: t('cancel'),
                        onOk: async () => {
                          try {
                            await deleteCategory(item.id);
                            Toast.success('删除成功');
                            dataState.reload();
                          } catch (error) {
                            Toast.error(
                              error.response?.data?.error?.message ||
                                error.response?.data?.message ||
                                error.message ||
                                error
                            );
                          }
                        },
                      });
                    }}>
                    <Box component={Icon} icon={TrashIcon} fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </StyledListItem>
            );
          })}
        </List>

        {(dataState.loadingMore || dataState?.data?.next) && (
          <Box width={1} height={60} className="center" ref={loadingRef}>
            <Box display="flex" justifyContent="center">
              <CircularProgress size={24} />
            </Box>
          </Box>
        )}
      </>

      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={(e) => e.preventDefault()}>
        <DialogTitle className="between" zIndex="appBar" bgcolor="background.paper">
          <Box sx={{ wordWrap: 'break-word' }}>新分类</Box>

          <IconButton size="small" onClick={dialogState.close}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 1 }}>
          <Box>
            <Stack gap={2}>
              <Box>
                <Typography variant="subtitle2">{t('name')}</Typography>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      hiddenLabel
                      fullWidth
                      placeholder={t('name')}
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Box>
              <Box>
                <Typography variant="subtitle2">{t('icon')}</Typography>
                <Controller
                  name="icon"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      hiddenLabel
                      fullWidth
                      placeholder={t('icon')}
                      error={!!errors.icon}
                      helperText={errors.icon?.message}
                      InputProps={{
                        startAdornment: (
                          <IconButton edge="start" aria-label="info">
                            {icon ? <Icon icon={icon} /> : <Icon icon="tabler:settings" />}
                          </IconButton>
                        ),
                      }}
                    />
                  )}
                />
              </Box>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'flex-end', pl: 3 }}>
          <Stack direction="row" gap={1} alignItems="center">
            <Button className="cancel" variant="outlined" onClick={dialogState.close}>
              {t('cancel')}
            </Button>

            <PromiseLoadingButton
              className="save"
              variant="contained"
              loadingPosition="center"
              onClick={handleSubmit(onSubmit)}
              type="submit">
              {t('save')}
            </PromiseLoadingButton>
          </Stack>
        </DialogActions>
      </Dialog>

      {dialog}
    </Container>
  );
}

export default CategoryList;

const useFetchCategories = () => {
  const dataState = useInfiniteScroll(
    async (
      d: { list: any[]; next: boolean; size: number; page: number } = {
        list: [],
        next: false,
        size: 20,
        page: 1,
      }
    ) => {
      const { page = 1, size = 20 } = d || {};
      const { list: items, totalCount: total } = await getCategories({ page, pageSize: size });

      const list = (d?.list?.length || 0) + items.length;
      const next = Boolean(list < total);
      return { list: items || [], next, size, page: (d?.page || 1) + 1, total };
    },
    { isNoMore: (d) => !d?.next, reloadDeps: [] }
  );

  const [loadingRef] = useInfiniteScrollHook({
    loading: dataState.loading || dataState.loadingMore,
    hasNextPage: Boolean(dataState.data?.next),
    onLoadMore: () => dataState.loadMore(),
    rootMargin: '0px 0px 200px 0px',
  });

  return { loadingRef, dataState };
};
