import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

export default function KnowledgeRoutes() {
  return (
    <Routes>
      <Route index element={<VariablesList />} />
    </Routes>
  );
}

const VariablesList = lazy(() => import('./list'));
