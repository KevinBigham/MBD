export interface OnboardingChoiceOption {
  id: string;
  label: string;
  description: string;
}

export function OnboardingChoiceGrid({
  title,
  options,
  onSelect,
  disabled,
}: {
  title: string;
  options: readonly OnboardingChoiceOption[];
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="font-data text-[10px] uppercase tracking-[0.2em] text-dynasty-muted">{title}</div>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(option.id)}
            className="rounded-lg border border-dynasty-border bg-dynasty-base/50 p-4 text-left transition-colors hover:border-accent-primary hover:bg-accent-primary/10 disabled:opacity-50"
          >
            <div className="font-heading text-sm font-semibold text-dynasty-textBright">{option.label}</div>
            <p className="mt-2 font-data text-xs leading-5 text-dynasty-muted">{option.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
