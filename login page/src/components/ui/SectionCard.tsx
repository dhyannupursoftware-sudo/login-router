interface SectionCardProps {
  title?: string;
  subtitle?: string;
  sticky?: boolean;
  className?: string;
  children: React.ReactNode;
}

export default function SectionCard({ title, subtitle, sticky = false, className = "", children }: SectionCardProps) {
  return (
    <section className={`workspace-view-content ${sticky ? "sticky" : ""} ${className}`.trim()} style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
      {(title || subtitle) && (
        <div className="ui-section-head" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--todo-border)', marginBottom: '1rem' }}>
          {title && <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--todo-text-p)', margin: 0 }}>{title}</h2>}
          {subtitle && <p style={{ fontSize: '0.95rem', color: 'var(--todo-text-s)', marginTop: '0.5rem', margin: 0 }}>{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
