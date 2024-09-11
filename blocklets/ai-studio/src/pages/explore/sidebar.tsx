import { Category } from '@app/libs/category';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import {
  Box,
  CircularProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { useCategoryState } from './state';

function CategoriesSidebar({ categories }: { categories: Category[] }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const params = useParams();

  return (
    <Stack sx={{ width: 1, height: 1, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
        {t('category.title')}
      </Typography>

      {categories.length === 0 && (
        <Stack flex={1} height={0} justifyContent="center" alignItems="center">
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            gap={1}
            onClick={() => navigate('/admin/category')}>
            <Box component={Icon} icon="tabler:plus" sx={{ fontSize: 24, color: 'text.disabled' }} />
            <Typography sx={{ color: 'text.disabled' }}>{t('category.noCategories')}</Typography>
          </Box>
        </Stack>
      )}

      <List sx={{ my: 0, py: 0 }}>
        {categories.map((category) => (
          <ListItemButton
            key={category.id}
            onClick={() => navigate(category.id)}
            selected={category.id === params?.categoryId}>
            <ListItemIcon sx={{ minWidth: 0, mr: 1.5 }}>
              {category.icon ? <Icon icon={category.icon} /> : <Icon icon="tabler:settings" />}
            </ListItemIcon>
            <ListItemText primary={category.name} />
          </ListItemButton>
        ))}
      </List>
    </Stack>
  );
}

export default function ExploreCategorySlide() {
  const {
    state: { loading, categories },
  } = useCategoryState();

  return (
    <Stack width={1} height={1} overflow="hidden" direction="row">
      {loading ? (
        <Box width={1} height={1} display="flex" justifyContent="center" alignItems="center">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Box minWidth={300} maxWidth={500} width="20%">
            <CategoriesSidebar categories={categories} />
          </Box>

          <Box flex={1} width={0} overflow="overlay" bgcolor="background.default">
            <Outlet />
          </Box>
        </>
      )}
    </Stack>
  );
}
