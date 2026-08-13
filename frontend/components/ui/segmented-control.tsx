type Option = { value: string; label: string };

export function SegmentedControl({
  options,
  value,
  onChange,
  className = "",
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-1 rounded-2xl bg-ink-100 p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex h-7 items-center rounded-xl px-3 text-xs font-semibold transition ${
            value === o.value ? "bg-brand-600 text-white" : "text-ink-600 hover:text-ink-900"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}