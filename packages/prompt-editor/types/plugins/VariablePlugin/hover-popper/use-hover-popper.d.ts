import { LexicalEditor } from 'lexical';
type TypeAPI = {
  runClick: (e: MouseEvent) => void;
  runHover: (e: MouseEvent) => void;
  runKeyDown: (e: KeyboardEvent) => void;
  runKeyUp: (e: KeyboardEvent) => void;
};
declare const useHoverPopper: (editor: LexicalEditor) => [null | HTMLElement, TypeAPI];
export default useHoverPopper;
