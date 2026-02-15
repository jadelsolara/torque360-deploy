interface CardProps {
  children: React.ReactNode;
  className?: string;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

function Card({ children, className = '' }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-[var(--color-border)]
        shadow-sm overflow-hidden
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div
      className={`
        px-6 py-4 border-b border-[var(--color-border)]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function CardBody({ children, className = '' }: CardBodyProps) {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardBody };
export type { CardProps, CardHeaderProps, CardBodyProps };
