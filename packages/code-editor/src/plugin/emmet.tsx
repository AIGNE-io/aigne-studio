import { Monaco } from '@monaco-editor/react';
import { emmetCSS, emmetHTML, emmetJSX } from 'emmet-monaco-es';
import { editor } from 'monaco-editor';
import { useEffect, useRef } from 'react';

const useEmmet = () => {
  const disposeEmmetRef = useRef<{ html: any; css: any; jsx: any }>({ html: null, css: null, jsx: null });

  const onMount = (_editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    emmetJSX(monaco);
    emmetHTML(monaco);
    emmetCSS(monaco);

    // editor.addCommand(monaco.KeyCode.Tab, () => {
    //   const position = editor.getPosition();
    //   const model = editor.getModel();
    //   if (!model || !position) return;

    //   const word = model.getWordUntilPosition(position);
    //   const range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
    //   const endPosition = position.with(position.lineNumber, position.column);

    //   const abbreviation = model.getValueInRange(range);
    //   const expandedText = expandAbbreviation(abbreviation, { syntax: 'jsx' });

    //   if (expandedText) {
    //     editor.executeEdits(null, [
    //       {
    //         range: new monaco.Range(
    //           endPosition.lineNumber,
    //           endPosition.column,
    //           endPosition.lineNumber,
    //           endPosition.column
    //         ),
    //         text: expandedText,
    //         forceMoveMarkers: true,
    //       },
    //     ]);

    //     editor.setPosition(position);
    //   }
    // });
  };

  useEffect(() => {
    return () => {
      if (disposeEmmetRef.current?.html) {
        disposeEmmetRef.current.html();
      }

      if (disposeEmmetRef.current?.css) {
        disposeEmmetRef.current.css();
      }

      if (disposeEmmetRef.current?.jsx) {
        disposeEmmetRef.current.jsx();
      }
    };
  }, []);

  return {
    registerEmmet: onMount,
  };
};

export default useEmmet;
