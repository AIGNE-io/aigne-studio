import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

const Knowledge = lazy(() => import('./knowledge'));
const DetailKnowledge = lazy(() => import('./detail'));

export default function KnowledgeRoutes() {
  return (
    <Routes>
      <Route index element={<Knowledge />} />
      <Route path=":knowledgeId" element={<DetailKnowledge />} />
    </Routes>
  );
}
