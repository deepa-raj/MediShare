import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import DonorDashboard from './pages/DonorDashboard.jsx';
import NgoDashboard from './pages/NgoDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/MediShare" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/donor"
            element={<ProtectedRoute role="donor"><DonorDashboard /></ProtectedRoute>}
          />
          <Route
            path="/ngo"
            element={<ProtectedRoute role="ngo"><NgoDashboard /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>}
          />
        </Routes>
      </main>
      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-400">
        MediShare — built to keep good medicine from going to waste.
      </footer>
    </div>
  );
}
