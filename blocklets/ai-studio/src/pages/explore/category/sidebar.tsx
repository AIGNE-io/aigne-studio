import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BuildIcon from '@mui/icons-material/Build';
import BusinessCenterIcon from '@mui/icons-material/BusinessCenter';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import SchoolIcon from '@mui/icons-material/School';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

const categories = [
  { key: 'autonomous-agents', name: 'Autonomous Agents', icon: <AutoAwesomeIcon /> },
  { key: 'marketing-sales', name: 'Marketing & Sales', icon: <ShoppingCartIcon /> },
  { key: 'research-education', name: 'Research & Education', icon: <SchoolIcon /> },
  { key: 'finance-legal', name: 'Finance & Legal', icon: <AccountBalanceIcon /> },
  { key: 'fun-lifestyle', name: 'Fun & Lifestyle', icon: <EmojiEventsIcon /> },
  { key: 'hr-operations', name: 'HR & Operations', icon: <BusinessCenterIcon /> },
  { key: 'tools-integrations', name: 'Tools & Integrations', icon: <BuildIcon /> },
];

function CategoriesSidebar() {
  const navigate = useNavigate();
  const params = useParams();

  return (
    <Box sx={{ width: 1, height: 1, bgcolor: 'background.paper' }}>
      <Typography variant="h6" sx={{ p: 2, fontWeight: 'bold' }}>
        Categories
      </Typography>
      <List>
        {categories.map((category) => (
          <ListItemButton
            key={category.key}
            onClick={() => {
              navigate(category.key);
            }}
            selected={category.key === params?.tag}>
            <ListItemIcon sx={{ minWidth: 0, mr: 2 }}>{category.icon}</ListItemIcon>
            <ListItemText primary={category.name} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}

export default function ExploreCategorySlide() {
  return (
    <Stack width={1} height={1} overflow="hidden" direction="row">
      <Box minWidth={300} maxWidth={500} width="20%">
        <CategoriesSidebar />
      </Box>

      <Box flex={1} width={0} overflow="overlay" bgcolor="background.default">
        <Outlet />
      </Box>
    </Stack>
  );
}
