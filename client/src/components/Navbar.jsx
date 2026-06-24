import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="border-b border-stone-200 bg-sand-50/90 backdrop-blur sticky top-0 z-10">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center text-white text-sm font-bold">+</span>
          <span className="font-display text-lg font-semibold text-ink">MediShare</span>
        </Link>

        <div className="flex items-center gap-6 text-sm">
          <Link to="/" className="text-stone-600 hover:text-ink transition-colors">Browse</Link>

          {!user && (
            <>
              <Link to="/login" className="text-stone-600 hover:text-ink transition-colors">Log in</Link>
              <Link
                to="/register"
                className="bg-teal-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Get started
              </Link>
            </>
          )}

          {user && user.role === 'donor' && (
            <Link to="/donor" className="text-stone-600 hover:text-ink transition-colors">My donations</Link>
          )}
          {user && user.role === 'ngo' && (
            <Link to="/ngo" className="text-stone-600 hover:text-ink transition-colors">My claims</Link>
          )}
          {user && user.role === 'admin' && (
            <Link to="/admin" className="text-stone-600 hover:text-ink transition-colors">Admin</Link>
          )}

          {user && (
            <div className="flex items-center gap-4 pl-3 border-l border-stone-200">
              {user.role !== 'admin' && <NotificationBell />}
              <span className="text-stone-500 hidden sm:inline">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-stone-500 hover:text-coral-500 transition-colors font-medium"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
