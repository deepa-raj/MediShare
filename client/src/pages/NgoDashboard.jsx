import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import StatPill from '../components/StatPill.jsx';
import EmptyState from '../components/EmptyState.jsx';

const STATUS_STYLE = {
  pending: 'bg-amber-400/15 text-amber-500',
  approved: 'bg-teal-50 text-teal-700',
  completed: 'bg-stone-100 text-stone-500',
  declined: 'bg-coral-500/10 text-coral-500',
};

export default function NgoDashboard() {
  const [stats, setStats] = useState(null);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [statsRes, claimsRes] = await Promise.all([
      api.get('/stats/mine'),
      api.get('/medicines/claims/mine'),
    ]);
    setStats(statsRes.data);
    setClaims(claimsRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Your claims</h1>
          <p className="text-stone-500 mt-1">Medicine you've claimed for your organization.</p>
        </div>
        <Link to="/" className="bg-teal-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-teal-700 transition-colors">
          Browse available medicine
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4 mb-8 max-w-md">
          <StatPill label="Total claimed" value={stats.claimed} accent="ink" />
          <StatPill label="Completed handovers" value={stats.completed} accent="teal" />
        </div>
      )}

      {loading ? (
        <p className="text-stone-400 text-center py-16">Loading...</p>
      ) : claims.length === 0 ? (
        <EmptyState
          title="No claims yet"
          subtitle="Browse the available medicine feed and claim something your organization can use."
          action={<Link to="/" className="text-teal-600 font-medium text-sm">Go to listings →</Link>}
        />
      ) : (
        <div className="space-y-3">
          {claims.map((c) => (
            <div key={c.id} className="bg-white border border-stone-200 rounded-xl p-5 flex items-center gap-5 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-sm text-stone-500">{c.category} · {c.quantity} {c.unit} · {c.city}</p>
              </div>
              <div className="text-sm text-stone-500 min-w-[180px]">
                <p>Donor: <span className="text-ink font-medium">{c.donor_name}</span></p>
                <a href={`mailto:${c.donor_email}`} className="text-teal-600 hover:text-teal-700 text-xs block mt-0.5">
                  {c.donor_email}
                </a>
                {c.donor_phone && (
                  <a href={`tel:${c.donor_phone}`} className="text-teal-600 hover:text-teal-700 font-mono text-xs block">
                    {c.donor_phone}
                  </a>
                )}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLE[c.status]}`}>
                {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
