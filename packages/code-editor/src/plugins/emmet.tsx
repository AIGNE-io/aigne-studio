import { Monaco } from '@monaco-editor/react';
import { emmetCSS, emmetHTML, emmetJSX } from 'emmet-monaco-es';
import { useEffect, useRef } from 'react';

import type { EditorInstance } from '../libs/type';

const useEmmet = () => {
  const dispose = useRef<{ html: any; css: any; jsx: any }>({ html: null, css: null, jsx: null });

  const onMount = (_editor: EditorInstance, monaco: Monaco) => {
    dispose.current = {
      html: emmetHTML(monaco),
      css: emmetCSS(monaco),
      jsx: emmetJSX(monaco),
    };
  };

  useEffect(() => {
    return () => {
      if (dispose.current?.html) {
        dispose.current.html();
      }

      if (dispose.current?.css) {
        dispose.current.css();
      }

      if (dispose.current?.jsx) {
        dispose.current.jsx();
      }
    };
  }, []);

  return {
    registerEmmet: onMount,
  };
};

export default useEmmet;
