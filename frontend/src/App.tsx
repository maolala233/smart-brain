import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import UserEntry from './pages/UserEntry';
import LogicTest from './pages/LogicTest';
import Analysis from './pages/Analysis';
import Profile from './pages/Profile';
import UserList from './pages/UserList';
import KnowledgeGraph from './pages/KnowledgeGraph';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="entry" element={<UserEntry />} />
        <Route path="test" element={<LogicTest />} />
        <Route path="analysis" element={<Analysis />} />
        <Route path="profile" element={<Profile />} />
        <Route path="users" element={<UserList />} />
        <Route path="knowledge-graph" element={<KnowledgeGraph />} />
      </Route>
    </Routes>
  );
}

export default App;
