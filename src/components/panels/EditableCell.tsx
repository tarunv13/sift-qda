import { useEffect, useState } from "react";

interface Props {
  value: string;
  label: string;
  onCommit: (value: string) => unknown;
  placeholder?: string;
  className?: string;
}

/** A text input that saves on blur or Enter and reverts on Escape. */
export function EditableCell({ value, label, onCommit, placeholder, className = "" }: Props) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  return (
    <input
      value={draft}
      aria-label={label}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => draft !== value && onCommit(draft)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          setDraft(value);
          requestAnimationFrame(() => (e.target as HTMLInputElement).blur());
        }
      }}
      className={`w-full min-w-0 rounded bg-transparent px-1.5 py-1 outline-none placeholder:text-muted/50 hover:bg-paper focus:bg-paper focus:ring-2 focus:ring-accent/30 ${className}`}
    />
  );
}
