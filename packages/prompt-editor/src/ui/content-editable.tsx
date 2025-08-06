import './content-editable.css';

import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { Box, BoxProps } from '@mui/material';
import type { JSX } from 'react';

export type LexicalContentEditableProps = BoxProps<typeof ContentEditable>;

export default function LexicalContentEditable({ ...props }: LexicalContentEditableProps): JSX.Element {
  return <Box component={ContentEditable} {...props} className="ContentEditable__root" />;
}
