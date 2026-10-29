import Link from "next/link";
import { Fragment } from "react";

/**
 * Visible breadcrumb trail — one implementation for every page that has a
 * hierarchy, so the markup a crawler parses and the trail a visitor reads are
 * produced by the same code.
 *
 * The last crumb is never a link: it is the page you are already on, so it
 * renders as text with `aria-current="page"`. Everything before it links to
 * its own route, which is what makes the /tools hub one tap away from every
 * tool page instead of a back-button trip.
 */
export interface Crumb {
  name: string;
  /** Omitted on the last crumb, which is the current page. */
  href?: string;
}

export function Breadcrumb({
  trail,
  className = "",
}: {
  trail: readonly Crumb[];
  className?: string;
}) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={`micro flex flex-wrap items-center gap-2 ${className}`.trim()}
    >
      {trail.map((crumb, index) => {
        const last = index === trail.length - 1;
        return (
          <Fragment key={`${crumb.name}-${index}`}>
            {index > 0 ? (
              <span aria-hidden="true" className="text-[var(--text-3)]">
                /
              </span>
            ) : null}
            {last || !crumb.href ? (
              <span
                aria-current={last ? "page" : undefined}
                className="min-w-0 text-[var(--text-2)]"
              >
                {crumb.name}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-[var(--text-3)] transition-colors duration-200 hover:text-[var(--text-2)]"
              >
                {crumb.name}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
