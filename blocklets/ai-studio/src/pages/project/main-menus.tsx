import { Menus, MenusProps } from '@blocklet/studio-ui';
import { DesignServicesRounded, HomeRounded } from '@mui/icons-material';
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

export default function MainMenus({ ...props }: Omit<MenusProps, 'menus'>) {
  const { projectId } = useParams();

  const menus = useMemo(() => {
    const menus: MenusProps['menus'] = [];

    menus.push({ icon: <HomeRounded />, title: 'Home', url: projectId ? 'home' : '.' });

    if (projectId) {
      menus.push({ icon: <DesignServicesRounded />, title: 'Prompts', url: 'prompts' });
    }

    return menus;
  }, [projectId]);

  return <Menus {...props} menus={menus} />;
}
