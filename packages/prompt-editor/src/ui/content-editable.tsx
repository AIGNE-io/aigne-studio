import './content-editable.css';

import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { Box, BoxProps } from '@mui/material';

export default function LexicalContentEditable({ ...props }: BoxProps<typeof ContentEditable>): JSX.Element {
  return <Box component={ContentEditable} {...props} className="ContentEditable__root" />;
}
