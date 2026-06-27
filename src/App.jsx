import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth';
import Nav      from './components/Nav';
import Home     from './pages/Home';
import CaseDetail from './pages/CaseDetail';
import NewCase  from './pages/NewCase';
import MapPage  from './pages/MapPage';
import SpaceBackground from './components/SpaceBackground';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SpaceBackground />
        <Nav />
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/map"         element={<MapPage />} />
          <Route path="/cases/:id"   element={<CaseDetail />} />
          <Route path="/new"         element={<NewCase />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
