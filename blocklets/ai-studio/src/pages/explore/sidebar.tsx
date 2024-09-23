import { Category } from '@app/libs/category';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Icon } from '@iconify-icon/react';
import PlusIcon from '@iconify-icons/tabler/plus';
import {
  Box,
  Button,
  CircularProgress,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import ImportFromBlank from '../project/projects-page/import-from-blank';
import { useCategoryState } from './state';

function CategoriesSidebar({ categories }: { categories: Category[] }) {
  const { t } = useLocaleContext();
  const navigate = useNavigate();
  const params = useParams();
  const [dialog, setDialog] = useState<any>(null);
  useEffect(() => {
    if (categories.length && !params?.deploymentId) {
      navigate(`${categories?.[0]?.id}`, { replace: true });
    }
  }, []);

  return (
    <>
      <Stack
        sx={{
          width: 1,
          height: 1,
          bgcolor: 'background.paper',
          px: 2,
          py: 3,
          boxSizing: 'border-box',
        }}
        gap={2}>
        <Button
          variant="contained"
          sx={{ px: 2, py: 1, gap: 1, borderRadius: 1 }}
          className="center"
          onClick={() => {
            setDialog(<ImportFromBlank onClose={() => setDialog(null)} />);
          }}>
          <Box component={Icon} icon={PlusIcon} sx={{ width: 16, height: 16 }} className="center" />
          <Typography>{t('newObject', { object: t('project') })}</Typography>
        </Button>

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

        {!!categories.length && (
          <List sx={{ m: 0, p: 0 }}>
            {categories.map((category) => (
              <ListItemButton
                sx={{
                  borderRadius: 1.5,
                  p: 1,
                  mb: 0.5,
                  '&.Mui-selected': { bgcolor: '#EBF6FF', '.icon, .text': { color: '#3B82F6' } },
                }}
                key={category.id}
                onClick={() => navigate(category.id)}
                selected={category.id === params?.categoryId}>
                <ListItemIcon sx={{ minWidth: 0, mr: 1.5 }} className="icon">
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

      {dialog}
    </>
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
