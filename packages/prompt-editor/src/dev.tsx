import './index.css';

import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';
import * as React from 'react';
import { createRoot } from 'react-dom/client';

import PromptEditor from './app';
import { $createRoleSelectNode } from './plugins/RolePlugin/role-select-node';

function customText() {
  const root = $getRoot();
  if (root.getFirstChild() === null) {
    const paragraph = $createParagraphNode();
    paragraph.append(
      $createRoleSelectNode('system'),
      $createTextNode('The playground is a demo environment built with ')
    );

    root.append(paragraph);
  }
}

// Handle runtime errors
const showErrorOverlay = (err: Event) => {
  const ErrorOverlay = customElements.get('vite-error-overlay');
  if (!ErrorOverlay) {
    return;
  }
  const overlay = new ErrorOverlay(err);
  const { body } = document;
  if (body !== null) {
    body.appendChild(overlay);
  }
};

window.addEventListener('error', showErrorOverlay);
window.addEventListener('unhandledrejection', ({ reason }) => showErrorOverlay(reason));

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <PromptEditor editorState={customText} />
  </React.StrictMode>
);
