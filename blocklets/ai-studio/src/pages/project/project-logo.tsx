// import { getDefaultBranch } from '@app/store/current-git-store';
// import { useEffect } from 'react';
// import { useParams } from 'react-router-dom';

import styled from '@emotion/styled';
import { joinURL } from 'ufo';

const TemplateImage = styled('img')({
  width: '100%',
  height: '100%',
});

export default function ProjectLogo() {
  return <TemplateImage src={joinURL(window?.blocklet?.prefix ?? '/', '/images/logo.png')} alt="" />;
}
