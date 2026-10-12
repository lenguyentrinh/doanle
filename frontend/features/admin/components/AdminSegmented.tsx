interface AdminSegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface AdminSegmentedProps<T extends string> {
  options: AdminSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

// A pill-shaped tab group replacing a native <select> for short exclusive
// choices (sort order, product status tabs). Doesn't stretch full width —
// callers place it with `justify-self-end` in a grid or `ml-auto` in a flex
// row.
export default function AdminSegmented<T extends string>({
  options,
  value,
  onChange,
  className = '',
}: AdminSegmentedProps<T>) {
  return (
    <div className={`flex w-fit justify-self-end gap-1 rounded-full bg-fill p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`whitespace-nowrap rounded-full px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[.16em] transition-colors duration-200 ${
              active ? 'bg-white text-ink shadow-xs' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
