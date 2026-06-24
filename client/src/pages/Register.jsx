import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Alert from '../components/Alert.jsx';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState('donor');
  const [form, setForm] = useState({ name: '', email: '', password: '', org_name: '', city: '', phone: '' });
  const [location, setLocation] = useState(null); // { lat, lng } | null
  const [locationStatus, setLocationStatus] = useState('idle'); // idle | requesting | granted | denied | unsupported
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Best-effort only — declining this prompt is a completely normal,
  // supported path. It just means this account won't show up in
  // distance-based sorting or get "something was posted near you" nudges.
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      return;
    }
    setLocationStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocationStatus('granted');
      },
      () => setLocationStatus('denied'),
      { timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      // Only include optional fields when they actually have a value —
      // donors never see the org_name field, but it still exists as ''
      // in form state, and an empty string is not the same thing as
      // "this field wasn't filled in."
      const payload = { ...form, role };
      if (!payload.org_name) delete payload.org_name;
      if (!payload.phone) delete payload.phone;
      if (location) {
        payload.lat = location.lat;
        payload.lng = location.lng;
      }

      const user = await register(payload);
      navigate(role === 'donor' ? '/donor' : '/ngo');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl font-semibold text-ink mb-2">Create an account</h1>
      <p className="text-stone-500 mb-6">Tell us how you'll be using MediShare.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <RoleOption
          label="I'm donating" sub="Individual donor"
          active={role === 'donor'} onClick={() => setRole('donor')}
        />
        <RoleOption
          label="We're receiving" sub="NGO or clinic"
          active={role === 'ngo'} onClick={() => setRole('ngo')}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Field label={role === 'ngo' ? 'Contact person name' : 'Full name'}>
          <input required value={form.name} onChange={update('name')}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
        </Field>

        {role === 'ngo' && (
          <Field label="Organization name">
            <input required value={form.org_name} onChange={update('org_name')}
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
          </Field>
        )}

        <Field label="Email">
          <input type="email" required value={form.email} onChange={update('email')}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
        </Field>

        <Field label="Password">
          <input type="password" required minLength={6} value={form.password} onChange={update('password')}
            className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="City">
            <input required value={form.city} onChange={update('city')}
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
          </Field>
          <Field label="Phone (optional)">
            <input value={form.phone} onChange={update('phone')}
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
          </Field>
        </div>

        <div className="bg-sand-100 border border-stone-200 rounded-lg p-4">
          <p className="text-sm font-medium text-ink mb-1">Share your location (optional)</p>
          <p className="text-xs text-stone-500 mb-3">
            {role === 'ngo'
              ? "Lets you see medicine sorted by distance, and we'll nudge you when something is posted nearby."
              : "Lets nearby NGOs get notified when you post a donation."}
          </p>

          {locationStatus === 'granted' ? (
            <p className="text-sm text-teal-700 font-medium">✓ Location saved</p>
          ) : (
            <button
              type="button"
              onClick={requestLocation}
              disabled={locationStatus === 'requesting'}
              className="text-sm border border-stone-300 px-3 py-1.5 rounded-lg hover:border-teal-400 transition-colors disabled:opacity-50"
            >
              {locationStatus === 'requesting' ? 'Requesting...' : 'Share my location'}
            </button>
          )}

          {locationStatus === 'denied' && (
            <p className="text-xs text-coral-500 mt-2">
              Location permission was declined — that's fine, you can still use MediShare without it.
            </p>
          )}
          {locationStatus === 'unsupported' && (
            <p className="text-xs text-stone-400 mt-2">Your browser doesn't support location sharing.</p>
          )}
        </div>

        <button
          type="submit" disabled={submitting}
          className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
        >
          {submitting ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="text-sm text-stone-500 mt-6 text-center">
        Already have an account? <Link to="/login" className="text-teal-600 font-medium">Log in</Link>
      </p>
    </div>
  );
}

function RoleOption({ label, sub, active, onClick }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`text-left border rounded-xl px-4 py-3 transition-colors ${
        active ? 'border-teal-500 bg-teal-50' : 'border-stone-200 hover:border-stone-300'
      }`}
    >
      <p className="font-medium text-ink text-sm">{label}</p>
      <p className="text-xs text-stone-500 mt-0.5">{sub}</p>
    </button>
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
