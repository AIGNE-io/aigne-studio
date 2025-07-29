import { ClassNames } from '@emotion/react';
import { ChevronRight, Circle } from '@mui/icons-material';
import {
  Box,
  Collapse,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListProps,
  Tooltip,
  TooltipProps,
  alpha,
  listItemButtonClasses,
  listItemClasses,
  listItemIconClasses,
  listItemTextClasses,
  styled,
  tooltipClasses,
} from '@mui/material';
import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export interface MenusProps extends ListProps {
  collapsed?: boolean;
  menus: MenuItemConfig[];
}

export default function Menus({ collapsed = undefined, menus, ...props }: MenusProps) {
  return (
    <StyledList {...props} className={collapsed ? 'collapsed' : undefined} dense={collapsed}>
      {menus.map((menu, index) => (
        <MenuItem key={index} menu={menu} collapsed={collapsed} />
      ))}
    </StyledList>
  );
}

export type MenuItemConfig = {
  icon?: ReactNode;
  title: ReactNode;
  url: string;
  children?: MenuItemConfig[];
};

export function MenuItem({ menu, collapsed = undefined }: { menu: MenuItemConfig; collapsed?: boolean }) {
  const pathname = useLocation().pathname.toLowerCase();
  const toPathname = menu.url.toLowerCase();

  const isActive =
    pathname === toPathname || (pathname.startsWith(toPathname) && pathname.charAt(toPathname.length) === '/');

  const [open, setOpen] = useState(isActive);

  useEffect(() => {
    if (!isActive) {
      setOpen(false);
    }
  }, [isActive]);

  const children = (
    <ListItem disablePadding>
      <ListItemButton
        component={NavLink}
        to={menu.url}
        onClick={
          collapsed || !menu.children?.length
            ? undefined
            : (e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(!open);
              }
        }>
        <ListItemIcon>{menu.icon}</ListItemIcon>

        <ListItemText primary={menu.title} />

        {!!menu.children?.length && (
          <ClassNames>
            {({ cx }) => <Box className={cx('expand-icon', !collapsed && open && 'open')} component={ChevronRight} />}
          </ClassNames>
        )}
      </ListItemButton>
    </ListItem>
  );

  const submenus = !!menu.children?.length && (
    <List disablePadding dense={collapsed}>
      {menu.children.map((menu, index) => (
        <ListItem key={`submenu-${index}`} disablePadding>
          <ListItemButton component={NavLink} to={menu.url}>
            {!collapsed && (
              <ListItemIcon>
                <Circle fontSize="inherit" />
              </ListItemIcon>
            )}

            <ListItemText primary={menu.title} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  return (
    <>
      {submenus && collapsed ? (
        <StyledTooltip title={submenus} placement="right" disableFocusListener disableTouchListener>
          {children}
        </StyledTooltip>
      ) : (
        children
      )}

      {submenus && !collapsed && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          {submenus}
        </Collapse>
      )}
    </>
  );
}

const StyledList = styled(List)`
  max-width: 100%;
  overflow: hidden auto;
  padding-top: 16px;
  padding-bottom: 16px;

  .${listItemClasses.root} {
    margin-top: 4px;
    margin-bottom: 4px;

    .${listItemButtonClasses.root} {
      margin-left: 16px;
      margin-right: 16px;
      padding-left: 16px;
      padding-right: 16px;
      border-radius: 8px;
      overflow: hidden;
      padding-top: 8px;
      padding-bottom: 8px;

      .${listItemIconClasses.root} {
        margin-right: 16px;
        min-width: 24px;
        width: 24px;
        height: 24px;
        font-size: 24px;
      }

      .${listItemTextClasses.root} {
        max-width: 100%;
        margin-top: 0;
        margin-bottom: 0;

        .${listItemTextClasses.primary} {
          white-space: nowrap;
          font-size: 16px;
          width: 100%;
          overflow: hidden;
        }
      }

      .expand-icon {
        font-size: 18px;
        color: ${(props) => props.theme.palette.text.secondary};
        transition: transform ${(props) => props.theme.transitions.duration.short}ms ease-in-out;

        &.open {
          transform: rotate(-90deg);
        }
      }
    }
  }

  &.collapsed {
    padding-top: 0;
    padding-bottom: 0;

    .${listItemClasses.root} {
      .${listItemButtonClasses.root} {
        flex-direction: column;
        margin-left: ${({ theme }) => theme.spacing(1)};
        margin-right: ${({ theme }) => theme.spacing(1)};
        padding-left: ${({ theme }) => theme.spacing(0.5)};
        padding-right: ${({ theme }) => theme.spacing(0.5)};

        .${listItemIconClasses.root} {
          margin-right: 0;
        }

        .expand-icon {
          position: absolute;
          right: 6px;
          top: 11px;
        }
      }
    }

    > .${listItemClasses.root} {
      .${listItemTextClasses.root} {
        .${listItemTextClasses.primary} {
          font-size: 10px;
        }
      }
    }
  }

  > .${listItemClasses.root} {
    .${listItemButtonClasses.root} {
      color: ${({ theme }) => theme.palette.text.secondary};

      &.active {
        background-color: ${({ theme }) => theme.palette.action.selected};
        color: ${({ theme }) => theme.palette.text.primary};

        .${listItemIconClasses.root} {
          font-size: 8px;
          color: ${({ theme }) => theme.palette.text.secondary};
        }
      }
    }

    .${listItemIconClasses.root} {
      font-size: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all ${({ theme }) => theme.transitions.duration.short}ms ease-in-out;
      color: ${({ theme }) => alpha(theme.palette.text.secondary, theme.palette.action.disabledOpacity)};
    }
  }
`;

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
    boxShadow: theme.shadows[1],
    marginLeft: '0 !important',
    borderRadius: 6,
    padding: 4,
  },

  [`.${listItemButtonClasses.root}`]: {
    borderRadius: 6,

    [`.${listItemTextClasses.primary}`]: {
      fontSize: 16,
    },

    '&.active': {
      backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.selectedOpacity),
    },
  },
}));
