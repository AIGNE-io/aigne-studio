import useDialog from '@app/utils/use-dialog';
import { useLocaleContext } from '@arcblock/ux/lib/Locale/context';
import { Assessment, AutoAwesome, Forum, HowToVote, MenuBook, Settings } from '@mui/icons-material';
import {
  Box,
  Button,
  Container,
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
import { Controller, useForm } from 'react-hook-form';

const StyledListItem = styled(ListItem)(() => ({
  borderRadius: '8px',
  marginBottom: '8px',
  backgroundColor: '#f5f5f5',
  '&:hover': {
    backgroundColor: '#e0e0e0',
  },
}));

const listItems = [
  { icon: <Settings />, text: 'General', secondaryText: '' },
  { icon: <Forum />, text: 'Discussions', secondaryText: '' },
  { icon: <AutoAwesome />, text: 'AI Studio', secondaryText: '' },
  { icon: <HowToVote />, text: 'Vote', secondaryText: '' },
  { icon: <Assessment />, text: 'AI 専用Board', secondaryText: '' },
  { icon: <MenuBook />, text: 'AIGC', secondaryText: '' },
];

function CustomList() {
  const { dialog, showDialog } = useDialog();
  const { t } = useLocaleContext();
  const { control, handleSubmit } = useForm<{ name: string; description: string }>({});

  const onSubmit = (data: { name: string; description: string }) => {
    console.log(data);
  };

  return (
    <Container>
      <Box className="between" mt={2.5} mb={1.5}>
        <Box sx={{ fontWeight: 700, fontSize: 24, lineHeight: '32px', color: '#030712' }}>分类</Box>
        <Button
          variant="contained"
          color="primary"
          onClick={() => {
            showDialog({
              maxWidth: 'sm',
              fullWidth: true,
              title: <Box sx={{ wordWrap: 'break-word' }}>{t('editObject', { object: t('knowledge.knowledge') })}</Box>,
              content: (
                <form onSubmit={handleSubmit(onSubmit)}>
                  <Stack gap={2}>
                    <Box>
                      <Typography variant="subtitle2">{t('name')}</Typography>
                      <Controller
                        name="name"
                        control={control}
                        defaultValue=""
                        render={({ field }) => (
                          <TextField {...field} hiddenLabel fullWidth placeholder={t('knowledge.namePlaceholder')} />
                        )}
                      />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">{t('description')}</Typography>
                      <Controller
                        name="description"
                        control={control}
                        defaultValue=""
                        render={({ field }) => <TextField {...field} hiddenLabel fullWidth multiline minRows={2} />}
                      />
                    </Box>
                  </Stack>
                </form>
              ),
              okText: t('save'),
              cancelText: t('cancel'),
              onOk: handleSubmit(onSubmit),
            });
          }}>
          添加分类
        </Button>
      </Box>
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {listItems.map((item, index) => (
          <StyledListItem key={index}>
            <ListItemIcon sx={{ minWidth: 0, mr: 1.5 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} secondary={item.secondaryText} />
            <ListItemSecondaryAction sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <IconButton edge="end" aria-label="info">
                <Settings fontSize="small" />
              </IconButton>
              <IconButton edge="end" aria-label="edit">
                <Settings fontSize="small" />
              </IconButton>
              <IconButton edge="end" aria-label="delete">
                <Settings fontSize="small" />
              </IconButton>
            </ListItemSecondaryAction>
          </StyledListItem>
        ))}
      </List>
      {dialog}
    </Container>
  );
}

export default CustomList;
