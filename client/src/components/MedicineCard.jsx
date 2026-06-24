import ExpiryBar from './ExpiryBar.jsx';

const STATUS_BADGE = {
  available: 'bg-teal-50 text-teal-700',
  claimed: 'bg-amber-400/15 text-amber-500',
  completed: 'bg-stone-100 text-stone-500',
  cancelled: 'bg-stone-100 text-stone-400',
};

export default function MedicineCard({ medicine, action }) {
  const { name, category, quantity, unit, city, description, days_left, urgency, status, donor_name, distance_km } = medicine;

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 flex flex-col gap-4 hover:shadow-md hover:border-teal-200 transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-ink leading-tight">{name}</h3>
          <p className="text-sm text-stone-500 mt-0.5">{category}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${STATUS_BADGE[status] || STATUS_BADGE.available}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <ExpiryBar daysLeft={days_left} urgency={urgency} />

      <div className="flex items-center gap-4 text-sm text-stone-600">
        <span className="font-mono">{quantity} {unit}</span>
        <span>·</span>
        <span>{city}</span>
        {distance_km != null && (
          <>
            <span>·</span>
            <span className="text-teal-600 font-medium">{distance_km} km away</span>
          </>
        )}
      </div>

      {description && <p className="text-sm text-stone-500 leading-relaxed">{description}</p>}

      {donor_name && (
        <p className="text-xs text-stone-400 -mt-1">Donated by {donor_name}</p>
      )}

      {action && <div className="mt-auto pt-1">{action}</div>}
    </div>
  );
}
