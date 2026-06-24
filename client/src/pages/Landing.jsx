import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import MedicineCard from '../components/MedicineCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';

const CATEGORIES = [
  'Pain Relief', 'Antibiotic', 'Diabetes', 'Allergy', 'Cold & Cough',
  'Supplement', 'Cardiac', 'Other',
];

export default function Landing() {
  const { user } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [cities, setCities] = useState([]);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ city: '', category: '', search: '', sort: 'expiry' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState(null);
  const [feedback, setFeedback] = useState('');

  const loadMedicines = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (filters.city) params.city = filters.city;
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.sort === 'distance') params.sort = 'distance';
      const res = await api.get('/medicines', { params });
      setMedicines(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    api.get('/medicines/cities').then((res) => setCities(res.data)).catch(() => {});
    api.get('/stats/platform').then((res) => setStats(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    loadMedicines();
  }, [loadMedicines]);

  const handleClaim = async (medicine) => {
    setClaimingId(medicine.id);
    setFeedback('');
    setError('');
    try {
      await api.post(`/medicines/${medicine.id}/claim`, { note: '' });
      setFeedback(`Claim sent for ${medicine.name}. The donor will reach out to arrange handover.`);
      loadMedicines();
    } catch (err) {
      setError(err.message);
    } finally {
      setClaimingId(null);
    }
  };

  // Distance sorting only makes sense for a logged-in NGO — the backend
  // silently ignores sort=distance for anyone else, so hiding the toggle
  // for other roles avoids offering a control that wouldn't do anything.
  const canSortByDistance = user?.role === 'ngo';

  return (
    <div>
      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="max-w-2xl">
          <p className="text-teal-600 font-semibold text-sm tracking-wide uppercase mb-3">
            Unused medicine, used in time
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-semibold text-ink leading-tight">
            Most donated medicine doesn't expire on a shelf.<br />It expires in a drawer.
          </h1>
          <p className="text-stone-500 mt-5 text-lg leading-relaxed">
            MediShare connects people with leftover, unexpired medicine to NGOs and clinics
            that can put it to use before it's too late — tracked by an expiry clock, not a guess.
          </p>
          {!user && (
            <div className="flex gap-3 mt-8">
              <Link to="/register" className="bg-teal-600 text-white px-5 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors">
                Donate medicine
              </Link>
              <Link to="/register" className="border border-stone-300 text-ink px-5 py-3 rounded-lg font-medium hover:border-teal-400 transition-colors">
                Register as an NGO
              </Link>
            </div>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12 max-w-2xl">
            <StatBlock value={stats.totalDonated} label="Medicines listed" />
            <StatBlock value={stats.totalCompleted} label="Handed over" />
            <StatBlock value={stats.donors} label="Donors" />
            <StatBlock value={stats.ngos} label="NGOs & clinics" />
          </div>
        )}
      </section>

      {/* Browse feed */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h2 className="font-display text-2xl font-semibold text-ink">Available now</h2>

          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by name..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:border-teal-400"
            />
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
            >
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filters.city}
              onChange={(e) => setFilters((f) => ({ ...f, city: e.target.value }))}
              className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
            >
              <option value="">All cities</option>
              {cities.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {canSortByDistance && (
              <select
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                className="border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
              >
                <option value="expiry">Sort: soonest expiry</option>
                <option value="distance">Sort: nearest first</option>
              </select>
            )}
          </div>
        </div>

        {feedback && <div className="mb-4"><Alert variant="success">{feedback}</Alert></div>}
        {error && <div className="mb-4"><Alert variant="error">{error}</Alert></div>}

        {loading ? (
          <p className="text-stone-400 text-center py-16">Loading listings...</p>
        ) : medicines.length === 0 ? (
          <EmptyState
            title="No listings match these filters"
            subtitle="Try widening your search, or check back soon — new donations come in regularly."
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {medicines.map((m) => (
              <MedicineCard
                key={m.id}
                medicine={m}
                action={
                  user?.role === 'ngo' ? (
                    <button
                      onClick={() => handleClaim(m)}
                      disabled={claimingId === m.id}
                      className="w-full bg-teal-600 text-white py-2 rounded-lg font-medium text-sm hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      {claimingId === m.id ? 'Claiming...' : 'Claim for pickup'}
                    </button>
                  ) : !user ? (
                    <Link
                      to="/register"
                      className="block text-center w-full border border-stone-300 text-stone-600 py-2 rounded-lg font-medium text-sm hover:border-teal-400 transition-colors"
                    >
                      Sign in as an NGO to claim
                    </Link>
                  ) : null
                }
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatBlock({ value, label }) {
  return (
    <div>
      <p className="font-display text-3xl font-semibold text-teal-600">{value}</p>
      <p className="text-sm text-stone-500">{label}</p>
    </div>
  );
}
