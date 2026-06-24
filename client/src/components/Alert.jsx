const VARIANTS = {
  error: 'bg-coral-500/10 text-coral-500 border-coral-500/20',
  success: 'bg-teal-50 text-teal-700 border-teal-200',
};

export default function Alert({ variant = 'error', children }) {
  if (!children) return null;
  return (
    <div className={`text-sm rounded-lg border px-4 py-3 ${VARIANTS[variant]}`}>
      {children}
    </div>
  );
}
