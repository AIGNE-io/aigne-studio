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
