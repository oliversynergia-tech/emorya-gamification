import Link from "next/link";

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: {
    label: string;
    href: string;
  };
}) {
  return (
    <div className="empty-state" role="status" aria-live="polite">
      <strong>{title}</strong>
      <p>{message}</p>
      {action ? (
        <Link className="button button--secondary button--small" href={action.href}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
