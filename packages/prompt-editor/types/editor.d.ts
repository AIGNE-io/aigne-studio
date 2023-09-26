/// <reference types="react" />
import { LexicalEditor } from 'lexical';
export default function Editor({
  useRole,
  useVariable,
  DEBUG,
  floatItems,
}: {
  useRole: boolean;
  useVariable: boolean;
  DEBUG: boolean;
  floatItems?: (data: { editor: LexicalEditor }) => any;
}): JSX.Element;
