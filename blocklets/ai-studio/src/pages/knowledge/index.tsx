import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

export default function KnowledgeRoutes() {
  return (
    <Routes>
      <Route index element={<KnowledgeDatasets />} />
      <Route path=":datasetId" element={<KnowledgeDocuments />} />
      <Route path=":datasetId/add" element={<KnowledgeAdd />} />
      <Route path=":datasetId/edit" element={<KnowledgeAdd />} />
      <Route path=":datasetId/document/:documentId" element={<KnowledgeSegments />} />
    </Routes>
  );
}

const KnowledgeDatasets = lazy(() => import('./datasets'));

const KnowledgeDocuments = lazy(() => import('./documents'));

const KnowledgeAdd = lazy(() => import('./add'));

const KnowledgeSegments = lazy(() => import('./segments'));
