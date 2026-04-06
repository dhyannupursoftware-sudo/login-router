interface EmptyStateProps {
  title: string;
  description: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
}

export default function EmptyState({ title, description, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div className="ui-empty-state">
      <div className="ui-empty-icon" aria-hidden="true">!</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {ctaLabel && onCtaClick && (
        <button type="button" className="todoist-btn-primary" onClick={onCtaClick}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
