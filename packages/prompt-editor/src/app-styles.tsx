import { GlobalStyles, useTheme } from '@mui/material';
import { useMemo } from 'react';

export default function AppStyles() {
  const theme = useTheme();
  const styles = useMemo(() => {
    const { palette } = theme;

    return {
      pre: {
        lineHeight: 1.1,
        background: '#222',
        color: '#fff',
        margin: '0',
        padding: '10px',
        fontSize: '12px',
        overflow: 'auto',
        maxHeight: '400px',
      },
      '.debug-treetype-button,\n.debug-timetravel-button': { display: 'none' },
      '.comment-dom': { color: 'slategray', wordBreak: 'break-word' },
      '#typeahead-menu': { zIndex: 10001 },
      '.typeahead-popover': {
        background: palette.background.paper,
        boxShadow: theme.shadows[2],
        borderRadius: '8px',
        marginTop: '25px',
      },
      '.typeahead-popover ul': {
        padding: '0',
        listStyle: 'none',
        margin: '0',
        borderRadius: '8px',
        maxHeight: '200px',
        overflowY: 'scroll',
        msOverflowStyle: 'none',
        scrollbarWidth: 'none',
      },
      '.typeahead-popover ul::-webkit-scrollbar': { display: 'none' },
      '.typeahead-popover ul li': {
        margin: '0',
        minWidth: '180px',
        fontSize: '14px',
        outline: 'none',
        cursor: 'pointer',
        borderRadius: '8px',
      },
      '.typeahead-popover ul li.selected': { background: palette.action.selected },
      '.typeahead-popover li': {
        margin: '0 8px 0 8px',
        padding: '8px',
        color: palette.text.primary,
        cursor: 'pointer',
        lineHeight: '16px',
        fontSize: '15px',
        display: 'flex',
        alignContent: 'center',
        flexDirection: 'row',
        flexShrink: 0,
        backgroundColor: palette.background.paper,
        borderRadius: '8px',
        border: '0',
      },
      '.typeahead-popover li.active': {
        display: 'flex',
        width: '20px',
        height: '20px',
        backgroundSize: 'contain',
      },
      '.typeahead-popover li:first-child': { borderRadius: '8px 8px 0px 0px' },
      '.typeahead-popover li:last-child': { borderRadius: '0px 0px 8px 8px' },
      '.typeahead-popover li:hover': { backgroundColor: palette.background.paper },
      '.typeahead-popover li .text': {
        display: 'flex',
        lineHeight: '20px',
        flexGrow: 1,
        minWidth: '150px',
      },
      '.typeahead-popover li .icon': {
        display: 'flex',
        width: '20px',
        height: '20px',
        userSelect: 'none',
        marginRight: '8px',
        lineHeight: '16px',
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      },
      '.component-picker-menu': { width: '200px', marginTop: '8px' },
    };
  }, [theme]);

  return <GlobalStyles styles={styles} />;
}
