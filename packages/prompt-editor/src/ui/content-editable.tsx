import './content-editable.css';

import { ContentEditable } from '@lexical/react/LexicalContentEditable';

export default function LexicalContentEditable({ className }: { className?: string }): JSX.Element {
  return <ContentEditable className={className || 'ContentEditable__root'} />;
}
