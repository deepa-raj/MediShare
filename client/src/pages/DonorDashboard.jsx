import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import StatPill from '../components/StatPill.jsx';
import ExpiryBar from '../components/ExpiryBar.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Alert from '../components/Alert.jsx';

const CATEGORIES = [
  'Pain Relief', 'Antibiotic', 'Diabetes', 'Allergy', 'Cold & Cough',
  'Supplement', 'Cardiac', 'Other',
];
const UNITS = ['strips', 'tablets', 'bottles', 'vials', 'sachets', 'tubes', 'boxes'];

const emptyForm = { name: '', category: 'Pain Relief', quantity: '', unit: 'strips', expiry_date: '', description: '', city: '' };

export default function DonorDashboard() {
  const [stats, setStats] = useState(null);
  const [listings, setListings] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    const [statsRes, listingsRes] = await Promise.all([
      api.get('/stats/mine'),
      api.get('/medicines/mine'),
    ]);
    setStats(statsRes.data);
    setListings(listingsRes.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/medicines', form);
      setForm(emptyForm);
      setShowForm(false);
      setFeedback('Listing posted. NGOs nearby can now see and claim it.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    setBusyId(id);
    try {
      await api.patch(`/medicines/${id}/cancel`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (id) => {
    setBusyId(id);
    try {
      await api.patch(`/medicines/${id}/complete`);
      setFeedback('Marked as handed over. Thank you for donating.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const minDate = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink">Your donations</h1>
          <p className="text-stone-500 mt-1">List unused medicine before it expires unused.</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="bg-teal-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ List medicine'}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <StatPill label="Posted" value={stats.posted} accent="ink" />
          <StatPill label="Awaiting handover" value={stats.pending} accent="amber" />
          <StatPill label="Completed" value={stats.completed} accent="teal" />
        </div>
      )}

      {feedback && <div className="mb-5"><Alert variant="success">{feedback}</Alert></div>}
      {error && <div className="mb-5"><Alert variant="error">{error}</Alert></div>}

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-stone-200 rounded-2xl p-6 mb-8 space-y-4">
          <h2 className="font-display text-lg font-semibold text-ink mb-2">New listing</h2>

          <Field label="Medicine name">
            <input required value={form.name} onChange={update('name')} placeholder="e.g. Paracetamol 500mg"
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <select value={form.category} onChange={update('category')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Expiry date">
              <input type="date" required min={minDate} value={form.expiry_date} onChange={update('expiry_date')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Quantity">
              <input type="number" required min="1" value={form.quantity} onChange={update('quantity')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
            </Field>
            <Field label="Unit">
              <select value={form.unit} onChange={update('unit')}
                className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
          </div>

          <Field label="City">
            <input required value={form.city} onChange={update('city')} placeholder="e.g. Chennai"
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
          </Field>

          <Field label="Notes (optional)">
            <textarea value={form.description} onChange={update('description')} rows={2}
              placeholder="Storage condition, why it's unused, anything an NGO should know."
              className="w-full border border-stone-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-teal-400" />
          </Field>

          <button type="submit" disabled={submitting}
            className="w-full bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50">
            {submitting ? 'Posting...' : 'Post listing'}
          </button>
        </form>
      )}

      {listings.length === 0 ? (
        <EmptyState
          title="No listings yet"
          subtitle="Post your first medicine donation — it takes less than a minute."
        />
      ) : (
        <div className="space-y-3">
          {listings.map((m) => (
            <div key={m.id} className="bg-white border border-stone-200 rounded-xl p-5">
              <div className="flex items-center gap-5 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <p className="font-medium text-ink">{m.name}</p>
                  <p className="text-sm text-stone-500">{m.category} · {m.quantity} {m.unit} · {m.city}</p>
                </div>
                <div className="w-40">
                  <ExpiryBar daysLeft={m.days_left} urgency={m.urgency} />
                </div>
                <StatusTag status={m.status} />
                <div className="flex gap-2">
                  {m.status === 'available' && (
                    <button
                      onClick={() => handleCancel(m.id)} disabled={busyId === m.id}
                      className="text-sm text-stone-500 border border-stone-300 px-3 py-1.5 rounded-lg hover:border-coral-400 hover:text-coral-500 transition-colors disabled:opacity-50"
                    >
                      Withdraw
                    </button>
                  )}
                  {m.status === 'claimed' && (
                    <button
                      onClick={() => handleComplete(m.id)} disabled={busyId === m.id}
                      className="text-sm bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      Mark handed over
                    </button>
                  )}
                </div>
              </div>

              {/* The notification just says "reach out to arrange handover" —
                  this is the part that actually lets a donor do that. */}
              {m.claimed_by && (m.status === 'claimed' || m.status === 'completed') && (
                <div className="mt-4 pt-4 border-t border-stone-100 flex items-center gap-4 flex-wrap text-sm">
                  <span className="text-stone-500">Claimed by <span className="text-ink font-medium">{m.claimed_by.name}</span></span>
                  <a href={`mailto:${m.claimed_by.email}`} className="text-teal-600 hover:text-teal-700 font-medium">
                    {m.claimed_by.email}
                  </a>
                  {m.claimed_by.phone && (
                    <a href={`tel:${m.claimed_by.phone}`} className="text-teal-600 hover:text-teal-700 font-medium font-mono">
                      {m.claimed_by.phone}
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusTag({ status }) {
  const styles = {
    available: 'bg-teal-50 text-teal-700',
    claimed: 'bg-amber-400/15 text-amber-500',
    completed: 'bg-stone-100 text-stone-500',
    cancelled: 'bg-stone-100 text-stone-400',
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${styles[status]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
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
