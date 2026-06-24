// ExpiryBar — the platform's signature visual element. Every medicine carries
// a ticking clock; this renders that clock as a small horizontal gauge instead
// of a plain "Expires: <date>" line, so urgency is felt at a glance, not read.
const STYLES = {
  expired: { fill: 'bg-stone-400', label: 'Expired', text: 'text-stone-500', pct: 100 },
  critical: { fill: 'bg-coral-500', label: 'Expires very soon', text: 'text-coral-500', pct: 88 },
  soon: { fill: 'bg-amber-500', label: 'Expiring soon', text: 'text-amber-500', pct: 55 },
  fresh: { fill: 'bg-teal-600', label: 'Good time left', text: 'text-teal-600', pct: 22 },
};

export default function ExpiryBar({ daysLeft, urgency }) {
  const style = STYLES[urgency] || STYLES.fresh;
  const dayLabel =
    urgency === 'expired'
      ? `Expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} ago`
      : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between mb-1">
        <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
        <span className="text-xs font-mono text-stone-500">{dayLabel}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${style.fill} transition-all duration-500`}
          style={{ width: `${style.pct}%` }}
        />
      </div>
    </div>
  );
}
