"use client";

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean | "indeterminate";
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}) {
  const checkedState = checked === true;
  const indeterminate = checked === "indeterminate";

  return (
    <div
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checkedState}
      aria-disabled={disabled}
      onClick={() => !disabled && onChange(!checkedState)}
      className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}
    >
      <span
        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[8px] border-2 transition-colors ${
          checkedState || indeterminate
            ? "border-brand-600 bg-brand-600"
            : "border-ink-300 bg-white hover:border-brand-400"
        }`}
      >
        {checkedState && (
          <span className="flex h-[10px] w-[10px] items-center justify-center rounded-[4px] bg-white" />
        )}
        {indeterminate && (
          <span className="flex h-[10px] w-[10px] items-center justify-center rounded-[4px] bg-white/80" />
        )}
      </span>
      {label && (
        <span className="min-w-0">
          <span className="block text-sm font-medium text-ink-900">{label}</span>
          {description && <span className="block text-xs text-ink-500">{description}</span>}
        </span>
      )}
    </div>
  );
}
