// A handful of inline SVG paths instead of an icon library.
const paths = {
  plus: "M12 5v14M5 12h14",
  x: "M18 6 6 18M6 6l12 12",
  chevron: "m9 18 6-6-6-6",
  back: "m15 18-6-6 6-6",
  upload: "M12 15V3m0 0L8 7m4-4 4 4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4",
  download: "M12 3v12m0 0-4-4m4 4 4-4M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4",
  search: "M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35",
  trash: "M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14",
  tag: "M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8ZM7.5 7.5h.01",
  note: "M5 3h14v13l-5 5H5zM14 21v-5h5",
  table: "M3 5h18v14H3zM3 10h18M9 5v14",
  sparkle: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z",
  quote: "M4 7h6v6H6c0 2 1 3.5 3 4M14 7h6v6h-4c0 2 1 3.5 3 4",
  page: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  check: "M5 12.5 10 17 19 7",
  sun: "M12 3v2m0 14v2m9-9h-2M5 12H3m15.36-6.36-1.41 1.41M7.05 16.95l-1.41 1.41m0-12.72 1.41 1.41m9.9 9.9 1.41 1.41M12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z",
  monitor: "M3 5h18v11H3zM8 20h8M12 16v4",
  chart: "M4 20V11M10 20V4M16 20v-6M3 20h18",
  compass:"M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Zm3.5-12.5-2 5-5 2 2-5z",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 16, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
