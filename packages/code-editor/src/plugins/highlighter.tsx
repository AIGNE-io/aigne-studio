import { Monaco } from '@monaco-editor/react';
import { shikiToMonaco } from '@shikijs/monaco';
import { createHighlighter } from 'shiki';

const useHighlighter = () => {
  const registerHighlighter = async (
    monaco: Monaco,
    options: {
      themes: string[];
      langs: string[];
    }
  ) => {
    try {
      const highlighter = await createHighlighter({
        themes: [...options.themes],
        langs: [...options.langs],
      });

      shikiToMonaco(highlighter, monaco);
    } catch (err) {
      console.error(err);
    }
  };

  return {
    registerHighlighter,
  };
};

export default useHighlighter;
