import PromiseLoadingButton from '@app/components/promise-loading-button';
import { getErrorMessage } from '@app/libs/api';
import { createCategory, deleteCategory, getCategories, updateCategory } from '@app/libs/category';
import { generateSlug } from '@app/libs/util';
import Close from '@app/pages/project/icons/close';
import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import Toast from '@arcblock/ux/lib/Toast';
import { Icon } from '@iconify-icon/react';
import EditIcon from '@iconify-icons/tabler/edit';
import ExternalLinkIcon from '@iconify-icons/tabler/external-link';
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
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import useInfiniteScrollHook from 'react-infinite-scroll-hook';
import { joinURL } from 'ufo';

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
    register,
  } = useForm<{ id?: string; name: string; icon: string; slug: string; orderIndex?: number }>({
    defaultValues: { id: '', name: '', icon: '', slug: '' },
  });

  const id = useWatch({ control, name: 'id' });
  const icon = useWatch({ control, name: 'icon' });
  const name = useWatch({ control, name: 'name' });

  const onSubmit = async (data: { id?: string; name: string; icon: string; slug: string; orderIndex?: number }) => {
    const { id, name, icon, slug, orderIndex } = data;
    const action = id ? 'update' : 'create';
    const actionData = { name, icon, slug: slug || generateSlug(name), orderIndex };

    try {
      if (id) {
        await updateCategory(id, actionData);
      } else {
        await createCategory(actionData);
      }

      Toast.success(`${action === 'update' ? t('update') : t('create')} ${t('success')}`);
      dialogState.close();

      reset();

      dataState.reload();
    } catch (error) {
      Toast.error(getErrorMessage(error));
    }
  };

  useEffect(() => {
    if (!id && name) setValue('slug', generateSlug(name));
  }, [name, id]);

  return (
    <Container>
      <Box
        className="between"
        sx={{
          mt: 2.5,
          mb: 1.5
        }}>
        <Box sx={{ fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#030712' }}>{t('category.title')}</Box>
        <Button
          data-testid="add-category-button"
          variant="contained"
          color="primary"
          onClick={() => {
            reset({ id: '', name: '', icon: '', slug: '', orderIndex: undefined });
            dialogState.open();
          }}>
          {t('category.add')}
        </Button>
      </Box>
      {categories?.length === 0 && (
        <Box
          className="center"
          sx={{
            width: 1,
            height: 400
          }}>
          <Typography>{t('category.noCategories')}</Typography>
        </Box>
      )}
      {!!categories.length && (
        <>
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {categories.map((item) => {
              return (
                <StyledListItem key={item.id} data-testid="category-item">
                  <ListItemIcon sx={{ minWidth: 0, mr: 1.5 }} data-testid="category-icon">
                    {item.icon ? <Icon icon={item.icon} /> : <Icon icon="tabler:settings" />}
                  </ListItemIcon>
                  <ListItemText primary={item.name} />
                  <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton
                      data-testid="category-link-button"
                      edge="end"
                      aria-label="edit"
                      onClick={() => {
                        window.open(
                          joinURL(globalThis.location.origin, window.blocklet.prefix, 'explore', item.slug),
                          '_blank'
                        );
                      }}>
                      <Box component={Icon} icon={ExternalLinkIcon} sx={{
                        fontSize: "small"
                      }} />
                    </IconButton>

                    <IconButton
                      data-testid="category-edit-button"
                      edge="end"
                      aria-label="edit"
                      onClick={() => {
                        reset(item);
                        dialogState.open();
                      }}>
                      <Box component={Icon} icon={EditIcon} sx={{
                        fontSize: "small"
                      }} />
                    </IconButton>
                    <IconButton
                      data-testid="category-delete-button"
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
                          title: <Box sx={{ wordWrap: 'break-word' }}>{t('category.deleteConfirm')}</Box>,
                          content: (
                            <Box>
                              <Typography
                                sx={{
                                  fontWeight: 500,
                                  fontSize: 16,
                                  lineHeight: "28px",
                                  color: "#4B5563"
                                }}>
                                {t('category.deleteDescription')}
                              </Typography>
                            </Box>
                          ),
                          okText: t('alert.delete'),
                          okColor: 'error',
                          cancelText: t('cancel'),
                          onOk: async () => {
                            try {
                              await deleteCategory(item.id);
                              Toast.success(t('alert.deleted'));
                              dataState.reload();
                            } catch (error) {
                              Toast.error(getErrorMessage(error));
                            }
                          },
                        });
                      }}>
                      <Box component={Icon} icon={TrashIcon} sx={{
                        fontSize: "small"
                      }} />
                    </IconButton>
                  </ListItemSecondaryAction>
                </StyledListItem>
              );
            })}
          </List>

          {(dataState.loadingMore || dataState?.data?.next) && (
            <Box
              className="center"
              ref={loadingRef}
              sx={{
                width: 1,
                height: 60
              }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center"
                }}>
                <CircularProgress size={24} />
              </Box>
            </Box>
          )}
        </>
      )}
      <Dialog
        {...bindDialog(dialogState)}
        fullWidth
        maxWidth="sm"
        component="form"
        onSubmit={(e) => e.preventDefault()}>
        <DialogTitle className="between" zIndex="appBar" bgcolor="background.paper">
          <Box sx={{ wordWrap: 'break-word' }}>{id ? t('category.edit') : t('category.add')}</Box>

          <IconButton size="small" onClick={dialogState.close}>
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ py: 1 }} data-testid="add-category-form">
          <Box>
            <Stack sx={{
              gap: 2
            }}>
              <Box>
                <Typography variant="subtitle2">{t('category.name')}</Typography>
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: 'Name is required' }}
                  render={({ field }) => (
                    <TextField
                      data-testid="name-field"
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
                <Typography variant="subtitle2">Slug</Typography>
                <Controller
                  name="slug"
                  control={control}
                  rules={{ required: 'Slug is required' }}
                  render={({ field }) => (
                    <TextField
                      data-testid="slug-field"
                      {...field}
                      hiddenLabel
                      fullWidth
                      placeholder="Slug"
                      error={!!errors.slug}
                      helperText={errors.slug?.message}
                    />
                  )}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2">Order Index (ASC)</Typography>
                <TextField
                  data-testid="orderIndex-field"
                  {...register('orderIndex', { valueAsNumber: true })}
                  hiddenLabel
                  fullWidth
                  type="number"
                  placeholder="Order Index"
                  error={!!errors.orderIndex}
                  helperText={errors.orderIndex?.message}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2">{t('category.icon')}</Typography>
                <Controller
                  name="icon"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      data-testid="icon-field"
                      {...field}
                      hiddenLabel
                      fullWidth
                      placeholder="mdi-light:account"
                      error={!!errors.icon}
                      helperText={errors.icon?.message}
                      slotProps={{
                        input: {
                          startAdornment: (
                            <IconButton edge="start" aria-label="info">
                              {icon ? <Icon icon={icon} /> : <Icon icon="tabler:settings" />}
                            </IconButton>
                          ),
                        }
                      }}
                    />
                  )}
                />

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column"
                  }}>
                  <Typography variant="caption">
                    {t('category.iconVisit')}
                    <a href="https://icon-sets.iconify.design/" target="_blank" rel="noreferrer">
                      https://icon-sets.iconify.design/
                    </a>
                  </Typography>
                  <Typography
                    sx={{ whiteSpace: 'break-spaces' }}
                    variant="caption"
                    dangerouslySetInnerHTML={{ __html: t('category.iconTip') }}
                  />
                </Box>
              </Box>
            </Stack>
          </Box>
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'flex-end', pl: 3 }}>
          <Stack
            direction="row"
            sx={{
              gap: 1,
              alignItems: "center"
            }}>
            <Button className="cancel" variant="outlined" onClick={dialogState.close}>
              {t('cancel')}
            </Button>

            <PromiseLoadingButton
              data-testid="save-button"
              className="save"
              variant="contained"
              loadingPosition="center"
              onClick={handleSubmit(onSubmit)}
              type="submit">
              {id ? t('category.edit') : t('category.add')}
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

      return { list: items || [], next: items.length >= size, size, page: (d?.page || 1) + 1, total };
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
