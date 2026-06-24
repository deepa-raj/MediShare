import { useEffect, useState, useCallback } from 'react';
import api from '../api/client.js';
import StatPill from '../components/StatPill.jsx';
import Alert from '../components/Alert.jsx';

const TABS = [
  { key: 'medicines', label: 'Listings' },
  { key: 'users', label: 'Users' },
  { key: 'claims', label: 'Claims' },
];

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [activeTab, setActiveTab] = useState('medicines');
  const [medicines, setMedicines] = useState([]);
  const [users, setUsers] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, medicinesRes, usersRes, claimsRes] = await Promise.all([
        api.get('/admin/overview'),
        api.get('/admin/medicines'),
        api.get('/admin/users'),
        api.get('/admin/claims'),
      ]);
      setOverview(overviewRes.data);
      setMedicines(medicinesRes.data);
      setUsers(usersRes.data);
      setClaims(claimsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleDeleteMedicine = async (id) => {
    if (!confirm('Remove this listing? This cannot be undone.')) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/medicines/${id}`);
      setMedicines((list) => list.filter((m) => m.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Remove this account? This also removes their listings and claims.')) return;
    setBusyId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((list) => list.filter((u) => u.id !== id));
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="font-display text-3xl font-semibold text-ink mb-1">Admin</h1>
      <p className="text-stone-500 mb-8">Platform oversight — listings, accounts, and claims.</p>

      {error && <div className="mb-5"><Alert variant="error">{error}</Alert></div>}

      {overview && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
          <StatPill label="Users" value={overview.totalUsers} accent="ink" />
          <StatPill label="Donors" value={overview.totalDonors} accent="teal" />
          <StatPill label="NGOs" value={overview.totalNgos} accent="teal" />
          <StatPill label="Listings" value={overview.totalMedicines} accent="amber" />
          <StatPill label="Claims" value={overview.totalClaims} accent="amber" />
        </div>
      )}

      <div className="flex gap-1 border-b border-stone-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key ? 'border-teal-600 text-teal-700' : 'border-transparent text-stone-500 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-stone-400 text-center py-16">Loading...</p>
      ) : (
        <>
          {activeTab === 'medicines' && (
            <Table
              rows={medicines}
              columns={[
                { key: 'name', label: 'Medicine' },
                { key: 'category', label: 'Category' },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
                { key: 'city', label: 'City' },
                { key: 'donor_name', label: 'Donor' },
              ]}
              renderAction={(r) => (
                <button
                  onClick={() => handleDeleteMedicine(r.id)}
                  disabled={busyId === r.id}
                  className="text-xs text-coral-500 hover:text-coral-600 font-medium disabled:opacity-50"
                >
                  Remove
                </button>
              )}
              emptyLabel="No listings on the platform yet."
            />
          )}

          {activeTab === 'users' && (
            <Table
              rows={users}
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'email', label: 'Email' },
                { key: 'role', label: 'Role', render: (r) => <RoleBadge role={r.role} /> },
                { key: 'city', label: 'City' },
              ]}
              renderAction={(r) =>
                r.role !== 'admin' ? (
                  <button
                    onClick={() => handleDeleteUser(r.id)}
                    disabled={busyId === r.id}
                    className="text-xs text-coral-500 hover:text-coral-600 font-medium disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="text-xs text-stone-300">—</span>
                )
              }
              emptyLabel="No users yet."
            />
          )}

          {activeTab === 'claims' && (
            <Table
              rows={claims}
              columns={[
                { key: 'medicine_name', label: 'Medicine' },
                { key: 'donor_name', label: 'Donor' },
                { key: 'ngo_name', label: 'NGO' },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
              ]}
              emptyLabel="No claims yet."
            />
          )}
        </>
      )}
    </div>
  );
}

function Table({ rows, columns, renderAction, emptyLabel }) {
  if (rows.length === 0) {
    return <div className="text-center py-16 text-stone-400 bg-white rounded-xl border border-dashed border-stone-300">{emptyLabel}</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-sand-100 text-stone-500 text-xs uppercase tracking-wide">
          <tr>
            {columns.map((c) => <th key={c.key} className="text-left px-4 py-2.5 font-medium">{c.label}</th>)}
            {renderAction && <th className="px-4 py-2.5"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="border-t border-stone-100">
              {columns.map((c) => (
                <td key={c.key} className="px-4 py-2.5 text-ink">
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
              {renderAction && <td className="px-4 py-2.5 text-right">{renderAction(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    available: 'bg-teal-50 text-teal-700',
    claimed: 'bg-amber-400/15 text-amber-500',
    completed: 'bg-stone-100 text-stone-500',
    cancelled: 'bg-stone-100 text-stone-400',
    pending: 'bg-amber-400/15 text-amber-500',
    declined: 'bg-coral-500/10 text-coral-500',
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status] || 'bg-stone-100 text-stone-500'}`}>
      {status}
    </span>
  );
}

function RoleBadge({ role }) {
  const styles = {
    donor: 'bg-teal-50 text-teal-700',
    ngo: 'bg-amber-400/15 text-amber-600',
    admin: 'bg-stone-200 text-stone-600',
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[role]}`}>{role}</span>;
}
