import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth';
import Nav      from './components/Nav';
import Home     from './pages/Home';
import CaseDetail from './pages/CaseDetail';
import NewCase  from './pages/NewCase';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/"            element={<Home />} />
          <Route path="/cases/:id"   element={<CaseDetail />} />
          <Route path="/new"         element={<NewCase />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
