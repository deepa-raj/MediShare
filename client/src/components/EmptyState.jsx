export default function EmptyState({ title, subtitle, action }) {
  return (
    <div className="text-center py-16 px-6 bg-white rounded-2xl border border-dashed border-stone-300">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {subtitle && <p className="text-sm text-stone-500 mt-1 max-w-sm mx-auto">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
