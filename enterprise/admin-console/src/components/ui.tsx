import { ReactNode } from 'react';
import clsx from 'clsx';

// === Card ===
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-xl border border-dark-border bg-dark-card p-5', className)}>
      {children}
    </div>
  );
}

// === Stat Card ===
export function StatCard({ title, value, subtitle, icon, trend, trendValue, color = 'primary' }: {
  title: string; value: string | number; subtitle?: string; icon: ReactNode;
  trend?: 'up' | 'down' | 'flat'; trendValue?: string;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'cyan';
}) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
    cyan: 'bg-cyan/10 text-cyan',
  };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-secondary">{title}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
          {trend && trendValue && (
            <div className="mt-2 flex items-center gap-1">
              <span className={clsx('text-xs font-medium', trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-text-muted')}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={clsx('flex h-11 w-11 items-center justify-center rounded-lg', colorMap[color])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

// === Badge ===
export function Badge({ children, color = 'default', dot }: {
  children: ReactNode; color?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'; dot?: boolean;
}) {
  const colorMap = {
    default: 'bg-dark-hover text-text-secondary',
    primary: 'bg-primary/10 text-primary-light',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  };
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', colorMap[color])}>
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', color === 'success' ? 'bg-success' : color === 'danger' ? 'bg-danger' : color === 'warning' ? 'bg-warning' : 'bg-text-muted')} />}
      {children}
    </span>
  );
}

// === Button ===
export function Button({ children, variant = 'default', size = 'md', onClick, className, disabled }: {
  children: ReactNode; variant?: 'primary' | 'default' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg'; onClick?: () => void; className?: string; disabled?: boolean;
}) {
  const variants = {
    primary: 'bg-primary hover:bg-primary/80 text-white',
    default: 'bg-dark-hover hover:bg-dark-border text-text-primary border border-dark-border',
    danger: 'bg-danger/10 hover:bg-danger/20 text-danger',
    ghost: 'hover:bg-dark-hover text-text-secondary hover:text-text-primary',
    success: 'bg-success/10 hover:bg-success/20 text-success',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx('inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50', variants[variant], sizes[size], className)}
    >
      {children}
    </button>
  );
}

// === Page Header ===
export function PageHeader({ title, description, actions }: {
  title: string; description?: string; actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

// === Table ===
export function Table<T>({ columns, data, onRowClick, emptyText = 'No data' }: {
  columns: { key: string; label: string; render: (item: T) => ReactNode; width?: string }[];
  data: T[]; onRowClick?: (item: T) => void; emptyText?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-dark-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-dark-border bg-dark-bg/50">
            {columns.map(col => (
              <th key={col.key} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted" style={col.width ? { width: col.width } : undefined}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-dark-border">
          {data.length === 0 ? (
            <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-text-muted">{emptyText}</td></tr>
          ) : (
            data.map((item, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(item)}
                className={clsx('bg-dark-card transition-colors hover:bg-dark-hover', onRowClick && 'cursor-pointer')}
              >
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-text-primary">{col.render(item)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// === Modal ===
export function Modal({ open, onClose, title, children, size = 'md', footer }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; footer?: ReactNode;
}) {
  if (!open) return null;
  const sizeMap = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={clsx('relative w-full rounded-xl border border-dark-border bg-dark-card shadow-2xl', sizeMap[size])}>
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4">
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-dark-hover hover:text-text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">{children}</div>
        {footer && <div className="border-t border-dark-border px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// === Tabs ===
export function Tabs({ tabs, activeTab, onChange }: {
  tabs: { id: string; label: string; count?: number }[]; activeTab: string; onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 border-b border-dark-border">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
            activeTab === tab.id
              ? 'border-primary text-primary-light'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-dark-border'
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={clsx('ml-2 rounded-full px-2 py-0.5 text-xs', activeTab === tab.id ? 'bg-primary/20 text-primary-light' : 'bg-dark-hover text-text-muted')}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// === Input ===
export function Input({ label, value, onChange, placeholder, type = 'text', description }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; description?: string;
}) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-text-primary">{label}</label>}
      {description && <p className="mb-1.5 text-xs text-text-muted">{description}</p>}
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none"
      />
    </div>
  );
}

// === Textarea ===
export function Textarea({ label, value, onChange, placeholder, rows = 4, description }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number; description?: string;
}) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-text-primary">{label}</label>}
      {description && <p className="mb-1.5 text-xs text-text-muted">{description}</p>}
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none resize-none"
      />
    </div>
  );
}

// === Select ===
export function Select({ label, value, onChange, options, placeholder, description }: {
  label?: string; value: string; onChange: (v: string) => void;
  options: { label: string; value: string; description?: string }[];
  placeholder?: string; description?: string;
}) {
  return (
    <div>
      {label && <label className="mb-1.5 block text-sm font-medium text-text-primary">{label}</label>}
      {description && <p className="mb-1.5 text-xs text-text-muted">{description}</p>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-dark-border bg-dark-bg px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none appearance-none"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// === Toggle ===
export function Toggle({ label, checked, onChange, description }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => onChange(!checked)}
        className={clsx('relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors', checked ? 'bg-primary' : 'bg-dark-border')}
      >
        <span className={clsx('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform', checked ? 'translate-x-5.5' : 'translate-x-0.5')} />
      </button>
      <div>
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {description && <p className="text-xs text-text-muted">{description}</p>}
      </div>
    </div>
  );
}

// === Status Dot ===
export function StatusDot({ status }: { status: 'active' | 'idle' | 'error' | 'archived' | 'inactive' | string }) {
  const colorMap: Record<string, string> = {
    active: 'bg-success', idle: 'bg-warning', error: 'bg-danger', archived: 'bg-text-muted', inactive: 'bg-text-muted',
  };
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={clsx('h-2 w-2 rounded-full', colorMap[status] || 'bg-text-muted')} />
      <span className="text-sm capitalize">{status}</span>
    </span>
  );
}
