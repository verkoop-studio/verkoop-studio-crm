/*
 * The four navigation icons, as the redesign canvas draws them.
 *
 * These are not lucide icons. Each one carries a part with its own class —
 * .tile, .mate, .node, .fold, .line — which the keyframes in styles.css move
 * when the nav item is hovered, and which prefers-reduced-motion stops.
 * Nothing here sets a colour: they inherit currentColor from the nav item.
 */
const common = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
  style: { flexShrink: 0 },
};

export type NavIconProps = { size?: number };

/** Four tiles that settle, one after the other. */
export function DashboardIcon({ size = 17 }: NavIconProps) {
  return (
    <svg className="ico-dash" width={size} height={size} {...common}>
      <rect className="tile t1" x="3" y="3" width="7" height="9" rx="1" />
      <rect className="tile t2" x="14" y="3" width="7" height="5" rx="1" />
      <rect className="tile t3" x="14" y="12" width="7" height="9" rx="1" />
      <rect className="tile t4" x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

/** A second person arriving beside the first. */
export function LeadsIcon({ size = 17 }: NavIconProps) {
  return (
    <svg className="ico-users" width={size} height={size} {...common}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path className="mate" d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

/** A node travelling down the branch. */
export function FlowIcon({ size = 17 }: NavIconProps) {
  return (
    <svg className="ico-branch" width={size} height={size} {...common}>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M6 9v6" />
      <path d="M20 6h-5a4 4 0 0 0-4 4v4" />
      <circle className="node" cx="20" cy="6" r="2" />
    </svg>
  );
}

/** A page whose corner lifts while its two lines are written. */
export function DocumentsIcon({ size = 17 }: NavIconProps) {
  return (
    <svg className="ico-doc" width={size} height={size} {...common}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path className="fold" d="M14 2v6h6" />
      <path className="line l1" d="M9 13h6" />
      <path className="line l2" d="M9 17h4" />
    </svg>
  );
}
