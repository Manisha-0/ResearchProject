/** A plain compass needle; north half filled. */
export function CompassMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 32 32"
      className={className}
      fill="none"
    >
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="2" />
      <path d="M16 5.5 20 16h-8l4-10.5Z" fill="currentColor" />
      <path
        d="M16 26.5 12 16h8l-4 10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="1.6" fill="#f7d774" />
    </svg>
  );
}
