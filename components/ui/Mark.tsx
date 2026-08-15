/**
 * The Seahive mark: seven stacked sine waves narrowing toward top and bottom
 * into a hexagonal silhouette. Sea, plus hive cell.
 *
 * The gradient runs amber into teal into deep sea. This is the one place amber
 * appears outside a live state — it is the greeting, not a signal.
 */
export default function Mark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="6 26 84 68"
      className={className}
      role="img"
      aria-label="Seahive Freight"
    >
      <defs>
        <linearGradient id="seahive-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFB547" />
          <stop offset="45%" stopColor="#19C6AE" />
          <stop offset="100%" stopColor="#0E5C7A" />
        </linearGradient>
      </defs>
      <g
        transform="translate(0,12) scale(0.8)"
        stroke="url(#seahive-mark)"
        fill="none"
        strokeLinecap="round"
      >
        <path
          d="M33.34 22.00 C40.18 18.54 45.50 18.54 52.34 22.00 C59.18 25.46 64.50 25.46 71.34 22.00 C76.86 18.54 81.14 18.54 86.66 22.00"
          strokeWidth="4.6"
        />
        <path
          d="M26.40 34.67 C33.24 38.13 38.56 38.13 45.40 34.67 C52.24 31.21 57.56 31.21 64.40 34.67 C71.24 38.13 76.56 38.13 83.40 34.67 C87.07 31.21 89.93 31.21 93.60 34.67"
          strokeWidth="5.6"
        />
        <path
          d="M19.45 47.33 C26.29 43.88 31.61 43.88 38.45 47.33 C45.29 50.79 50.61 50.79 57.45 47.33 C64.29 43.88 69.61 43.88 76.45 47.33 C83.29 50.79 88.61 50.79 95.45 47.33 C97.29 43.88 98.71 43.88 100.55 47.33"
          strokeWidth="6.2"
        />
        <path
          d="M12.50 60.00 C19.34 63.46 24.66 63.46 31.50 60.00 C38.34 56.54 43.66 56.54 50.50 60.00 C57.34 63.46 62.66 63.46 69.50 60.00 C76.34 56.54 81.66 56.54 88.50 60.00 C95.34 63.46 100.66 63.46 107.50 60.00"
          strokeWidth="6.6"
        />
        <path
          d="M19.45 72.67 C26.29 69.21 31.61 69.21 38.45 72.67 C45.29 76.13 50.61 76.13 57.45 72.67 C64.29 69.21 69.61 69.21 76.45 72.67 C83.29 76.13 88.61 76.13 95.45 72.67 C97.29 69.21 98.71 69.21 100.55 72.67"
          strokeWidth="6.2"
        />
        <path
          d="M26.40 85.33 C33.24 88.79 38.56 88.79 45.40 85.33 C52.24 81.88 57.56 81.88 64.40 85.33 C71.24 88.79 76.56 88.79 83.40 85.33 C87.07 81.88 89.93 81.88 93.60 85.33"
          strokeWidth="5.6"
        />
        <path
          d="M33.34 98.00 C40.18 94.54 45.50 94.54 52.34 98.00 C59.18 101.46 64.50 101.46 71.34 98.00 C76.86 94.54 81.14 94.54 86.66 98.00"
          strokeWidth="4.6"
        />
      </g>
    </svg>
  );
}
