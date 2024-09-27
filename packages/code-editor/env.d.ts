declare module 'monaco-vim' {
  type Vim = {
    handleKey: (instance: VimModeInstance, key: string) => void;
    exitInsertMode: (instance: VimModeInstance) => void;
  };

  export const VimMode: {
    Vim: Vim;
  };

  export function initVimMode(
    editor: ReturnType<(typeof import('monaco-editor'))['editor']['create']>,
    statusBar: HTMLElement
  ): VimModeInstance;
}
