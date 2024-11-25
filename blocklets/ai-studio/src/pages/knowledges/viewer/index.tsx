import { joinURL } from 'ufo';

import ObjectLazyDocxViewer from './lazy-docx';
import ObjectLazyPDFViewer from './lazy-pdf';
import ObjectLazyTextViewer from './lazy-text';

const getComponentMountPoint = (name: string) => {
  const m = globalThis.blocklet?.componentMountPoints.find((i) => i.name === name || i.did === name)?.mountPoint;
  if (!m) throw new Error(`No component mount point found for ${name}`);
  return m;
};

const AI_RUNTIME_DID = 'z2qaBP9SahqU2L2YA3ip7NecwKACMByTFuiJ2';
function getUrl(knowledgeId: string, filename: string) {
  return joinURL(window.location.origin, getComponentMountPoint(AI_RUNTIME_DID), 'upload', knowledgeId, filename);
}

const Viewer = ({ knowledgeId, filename }: { knowledgeId: string; filename: string }) => {
  const url = getUrl(knowledgeId, filename);

  if (url.endsWith('.pdf')) {
    return <ObjectLazyPDFViewer url={url} />;
  }

  if (url.endsWith('.docx') || url.endsWith('.doc')) {
    return <ObjectLazyDocxViewer url={url} />;
  }

  return <ObjectLazyTextViewer url={url} />;
};

export default Viewer;
