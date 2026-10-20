import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ArticlePage from './pages/ArticlePage'
import FavoritesPage from './pages/FavoritesPage'
import ReadLaterPage from './pages/ReadLaterPage'
import GroupsPage from './pages/GroupsPage'
import GroupPage from './pages/GroupPage'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="wiki/*" element={<ArticlePage />} />
          <Route path="favoritos" element={<FavoritesPage />} />
          <Route path="depois" element={<ReadLaterPage />} />
          <Route path="grupos" element={<GroupsPage />} />
          <Route path="grupos/:id" element={<GroupPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
