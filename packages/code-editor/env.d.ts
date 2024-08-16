declare module 'monaco-vim' {
  function initVimMode(
    editor: ReturnType<(typeof import('monaco-editor'))['editor']['create']>,
    statusBar: HTMLElement
  ): { dispose: () => void };
}
