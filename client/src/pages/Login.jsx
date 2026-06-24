import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.role === 'donor' ? '/donor' : '/ngo');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink mb-2">Welcome back</h1>
      <p className="text-stone-500 mb-8">Log in to manage your donations or claims.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Field label="Email">
          <input
            type="email" required value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400"
          />
        </Field>

        <Field label="Password">
          <input
            type="password" required value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400"
          />
        </Field>

        <button
          type="submit" disabled={submitting}
          className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="text-sm text-stone-500 mt-6 text-center">
        New here? <Link to="/register" className="text-teal-600 font-medium">Create an account</Link>
      </p>

      <div className="mt-10 pt-6 border-t border-stone-200 text-xs text-stone-400 space-y-1">
        <p className="font-medium text-stone-500">Demo accounts (password: password123)</p>
        <p>Donor — anita@example.com</p>
        <p>NGO — contact@hopeclinic.org</p>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-stone-700 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
