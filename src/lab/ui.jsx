/** The type icon shared by the Lab pages. Its own module so the page files
 *  export only their component, which fast refresh needs. */

export function TypeMark({ type }) {
  const common = {
    width: 34,
    height: 34,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (type) {
    case "case-study":
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "pipeline":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
          <path d="M7 12h3M14 12h3" />
        </svg>
      );
    case "agent":
      return (
        <svg {...common}>
          <rect x="5" y="8" width="14" height="11" rx="3" />
          <path d="M12 4v4M9 13h.01M15 13h.01" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M13 3 5 14h6l-1 7 8-11h-6l1-7Z" />
        </svg>
      );
  }
}
