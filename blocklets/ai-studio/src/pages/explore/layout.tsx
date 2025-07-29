import { Category } from '@app/libs/category';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Theme,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { Suspense, useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import Loading from '../../components/loading';
import { useProjectLimiting } from '../../contexts/projects';
import { useSessionContext } from '../../contexts/session';
import ImportFromBlank from '../project/projects-page/import-from-blank';
import { useCategoryState } from './state';

function CreateProject() {
  const { t } = useLocaleContext();
  const { session } = useSessionContext();
  const [dialog, setDialog] = useState<any>(null);
  const { checkProjectLimitAsync } = useProjectLimiting();

  const handleClick = async () => {
    if (!session.user) {
      await new Promise<void>((resolve) => {
        session.login(() => resolve());
      });
    }
    if (await checkProjectLimitAsync()) {
      setDialog(<ImportFromBlank onClose={() => setDialog(null)} />);
    }
  };

  return (
    <>
      <Button
        data-testid="create-project-button"
        variant="contained"
        sx={{ px: 2, py: 1, gap: 1, borderRadius: 1 }}
        className="center"
        onClick={handleClick}>
        <Box component={Icon} icon={PlusIcon} sx={{ width: 16, height: 16 }} className="center" />
        <Typography>{t('newObject', { object: t('project') })}</Typography>
      </Button>

      {dialog}
    </>
  );
}

function CategoriesSidebar({
  categories = [],
  onClose,
  isMobile,
}: {
  categories: Category[];
  onClose: () => void;
  isMobile: boolean;
}) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const params = useParams();

  const handleCategoryClick = (categorySlug: string) => {
    const newPath = `/explore/${categorySlug}`;
    navigate(newPath);

    if (isMobile) {
      onClose();
    }
  };

  return (
    <Stack
      data-testid="categories-sidebar"
      sx={{
        width: 1,
        height: 1,
        bgcolor: 'background.paper',
        boxSizing: 'border-box',
        py: 2,
      }}>
      {isMobile ? (
        <Box>
          <Box
            sx={{
              px: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}>
            <IconButton sx={{ p: '5px', borderRadius: 1, border: '1px solid #EFF1F5' }} onClick={onClose}>
              <Box component={Icon} icon="tabler:x" sx={{ fontSize: 20 }} />
            </IconButton>

            <Typography sx={{ fontSize: 16, fontWeight: 500, lineHeight: '24px', color: '#030712' }}>
              {t('category.title')}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />
        </Box>
      ) : (
        <Box
          sx={{
            px: 2,
            mb: 2,
            width: 1,
            button: { width: 1 },
          }}>
          <CreateProject />
        </Box>
      )}
      {categories.length === 0 && (
        <Stack
          sx={{
            flex: 1,
            height: 0,
            justifyContent: 'center',
            alignItems: 'center',
          }}>
          <Box
            data-testid="no-categories"
            onClick={() => navigate('/admin/category')}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
            }}>
            <Box component={Icon} icon="tabler:plus" sx={{ fontSize: 24, color: 'text.disabled' }} />
            <Typography sx={{ color: 'text.disabled' }}>{t('category.noCategories')}</Typography>
          </Box>
        </Stack>
      )}
      {!!categories.length && (
        <List sx={{ m: 0, p: 0, px: 2 }}>
          {categories.map((category) => (
            <ListItemButton
              data-testid="category-item"
              sx={{
                borderRadius: 1,
                p: 1,
                mb: 0.5,
                '&.Mui-selected': { bgcolor: '#EBF6FF', '.icon, .text': { color: '#3B82F6' } },
              }}
              key={category.id}
              onClick={() => handleCategoryClick(category.slug)}
              selected={category.slug === params?.categorySlug}>
              <ListItemIcon
                sx={{ minWidth: 0, mr: 1.5 }}
                className="icon"
                data-testid="category-icon"
                data-icon={category.icon}>
                {category.icon ? (
                  <Icon icon={category.icon} style={{ width: 20, height: 20, fontSize: 20 }} className="center" />
                ) : (
                  <Icon icon="tabler:settings" style={{ width: 20, height: 20, fontSize: 20 }} className="center" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={category.name}
                className="text"
                sx={{ m: 0, color: '#4B5563', fontSize: 16, lineHeight: '28px' }}
              />
            </ListItemButton>
          ))}
        </List>
      )}
    </Stack>
  );
}

export default function ExploreCategoryLayout() {
  const { state } = useCategoryState();
  const { loading, categories } = state;

  const params = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  useEffect(() => {
    if (!loading && categories.length && !params?.categorySlug && !params?.deploymentId) {
      navigate(`${categories?.[0]?.slug}`, { replace: true });
    }
  }, [loading]);

  // NOTE: 直接使用 `loading` 值作为条件可能会导致 `Outlet` re-mount.
  if (loading !== false) {
    return (
      <Box
        sx={{
          width: 1,
          height: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack
      direction={isMobile ? 'column' : 'row'}
      sx={{
        width: 1,
        height: 1,
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}>
      {!isMobile && (
        <Box
          sx={{
            minWidth: 300,
            maxWidth: 500,
            width: '20%',
            borderRight: '1px solid #EFF1F5',
          }}>
          <CategoriesSidebar categories={categories} isMobile={isMobile} onClose={() => {}} />
        </Box>
      )}
      <Box
        sx={{
          flex: 1,
          width: isMobile ? 1 : 0,
          height: 1,
          overflow: 'hidden',
        }}>
        <Suspense fallback={<Loading fixed />}>
          <Outlet context={{ categories }} />
        </Suspense>
      </Box>
    </Stack>
  );
}

export function MobileSidebarHeader({ categories = [] }: { categories: Category[] }) {
  const params = useParams();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = () => setDrawerOpen(!drawerOpen);

  if (!isMobile) {
    return null;
  }

  const currentCategory = categories.find((category) => category.slug === params?.categorySlug);
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
        }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}>
          <IconButton sx={{ p: '5px', borderRadius: 1, border: '1px solid #EFF1F5' }} onClick={toggleDrawer}>
            <Box component={Icon} icon="tabler:menu-2" sx={{ fontSize: 20 }} />
          </IconButton>

          <Box sx={{ fontSize: 16, fontWeight: 500, lineHeight: '24px', color: '#030712' }}>
            {currentCategory?.name}
          </Box>
        </Box>

        <CreateProject />
      </Box>
      <Drawer anchor="left" open={drawerOpen} onClose={toggleDrawer}>
        <Box
          sx={{
            minWidth: 300,
            maxWidth: 500,
            width: isMobile ? '100%' : '20%',
            height: 1,
          }}>
          <CategoriesSidebar categories={categories} isMobile={isMobile} onClose={() => setDrawerOpen(false)} />
        </Box>
      </Drawer>
    </>
  );
}
