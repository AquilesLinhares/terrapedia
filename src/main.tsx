import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import ArticlePage from './pages/ArticlePage'
import { installLinkPrefetch } from './lib/articleLoader'
import './index.css'

// Telas menos usadas ficam em arquivos separados, baixados só quando abrem (a primeira tela carrega menos)
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const ReadLaterPage = lazy(() => import('./pages/ReadLaterPage'))
const GroupsPage = lazy(() => import('./pages/GroupsPage'))
const GroupPage = lazy(() => import('./pages/GroupPage'))
const AccountPage = lazy(() => import('./pages/AccountPage'))
const CraftingTreePage = lazy(() => import('./pages/CraftingTreePage'))
const WorldPage = lazy(() => import('./pages/WorldPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const ClassesPage = lazy(() => import('./pages/ClassesPage'))
const ClassGuidePage = lazy(() => import('./pages/ClassGuidePage'))
const ToolsPage = lazy(() => import('./pages/ToolsPage'))
const MinionCalcPage = lazy(() => import('./pages/tools/MinionCalcPage'))
const ModifierPage = lazy(() => import('./pages/tools/ModifierPage'))
const BuffChecklistPage = lazy(() => import('./pages/tools/BuffChecklistPage'))
const ArenaPlannerPage = lazy(() => import('./pages/tools/ArenaPlannerPage'))
const ItemComparePage = lazy(() => import('./pages/tools/ItemComparePage'))

installLinkPrefetch()

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
          <Route path="conta" element={<AccountPage />} />
          <Route path="arvore/*" element={<CraftingTreePage />} />
          <Route path="mundo" element={<WorldPage />} />
          <Route path="historico" element={<HistoryPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="classes/:slug" element={<ClassGuidePage />} />
          <Route path="ferramentas" element={<ToolsPage />} />
          <Route path="ferramentas/lacaios" element={<MinionCalcPage />} />
          <Route path="ferramentas/modificador" element={<ModifierPage />} />
          <Route path="ferramentas/buffs" element={<BuffChecklistPage />} />
          <Route path="ferramentas/arena" element={<ArenaPlannerPage />} />
          <Route path="ferramentas/comparar" element={<ItemComparePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
