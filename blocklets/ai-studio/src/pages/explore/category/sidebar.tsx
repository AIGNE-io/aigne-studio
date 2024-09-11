import { Category } from '@app/libs/category';
import { Icon } from '@iconify-icon/react';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BuildIcon from '@mui/icons-material/Build';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
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

import { useCategoryState } from '../state';

function CategoriesSidebar({ categories }: { categories: Category[] }) {
  const navigate = useNavigate();
  const params = useParams();

  return (
    <Box sx={{ width: 1, height: 1, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
        Categories
      </Typography>
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
    </Box>
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
