export default function StatPill({ label, value, accent = 'teal' }) {
  const accents = {
    teal: 'text-teal-600',
    amber: 'text-amber-500',
    coral: 'text-coral-500',
    ink: 'text-ink',
  };
  return (
    <div className="bg-white border border-stone-200 rounded-xl px-5 py-4">
      <p className={`font-display text-3xl font-semibold ${accents[accent] || accents.teal}`}>{value}</p>
      <p className="text-sm text-stone-500 mt-1">{label}</p>
    </div>
  );
}
