export function Switch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative h-7 w-12 shrink-0 rounded-full bg-muted-foreground/30 transition-colors aria-checked:bg-primary hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span
        aria-hidden
        className="absolute left-1 top-1 size-5 rounded-full bg-muted-foreground transition-[transform,background-color] duration-200 ease-out data-[on=true]:translate-x-5 data-[on=true]:bg-primary-foreground"
        data-on={checked}
      />
    </button>
  );
}
