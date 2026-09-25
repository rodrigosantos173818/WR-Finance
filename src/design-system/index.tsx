'use client';

import {
  forwardRef,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { Dialog as D, DropdownMenu as M, Select as S, Tooltip as T } from 'radix-ui';
import { Check, ChevronDown, LoaderCircle, X } from 'lucide-react';

export type Tone = 'positive' | 'negative' | 'warning' | 'info' | 'neutral';
export const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'default' | 'sm' | 'icon';
    loading?: boolean;
  }
>(
  (
    { variant = 'secondary', size = 'default', loading, className, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      className={cx('wr-button', `wr-button--${variant}`, `wr-button--${size}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <LoaderCircle className="spin" size={16} />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

export function Card({
  children,
  className,
  featured,
  ...props
}: HTMLAttributes<HTMLElement> & { featured?: boolean }) {
  return (
    <section className={cx('wr-card', featured && 'wr-card--featured', className)} {...props}>
      {children}
    </section>
  );
}
export function Badge({
  children,
  tone = 'neutral',
  dot = true,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <span className={`wr-badge wr-badge--${tone}`}>
      {dot && <span className="wr-dot" />}
      {children}
    </span>
  );
}
export function Money({
  value,
  hidden,
  className = '',
}: {
  value: number;
  hidden?: boolean;
  className?: string;
}) {
  return (
    <span className={`wr-money ${className}`} aria-label={hidden ? 'Valor oculto' : undefined}>
      {hidden
        ? '••••••'
        : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            value / 100,
          )}
    </span>
  );
}
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="wr-logo" aria-label="WR Finance">
      <span className="wr-logo-symbol" aria-hidden="true">
        <svg viewBox="0 0 40 40" fill="none">
          <path
            d="M5 12 11 29 19 15 24 26 35 9"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M28 9h7v7"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {!compact && (
        <span>
          <strong>WR</strong> Finance<span className="wr-logo-period">.</span>
        </span>
      )}
    </span>
  );
}
export function Field({
  label,
  hint,
  error,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const generated = useId();
  const fieldId = id || generated;
  return (
    <div className={cx('wr-field', className)}>
      <label htmlFor={fieldId}>{label}</label>
      <input
        {...props}
        id={fieldId}
        className="wr-input"
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${fieldId}-hint` : undefined}
      />
      {(error || hint) && (
        <small id={`${fieldId}-hint`} className={error ? 'text-negative' : 'text-secondary'}>
          {error || hint}
        </small>
      )}
    </div>
  );
}
export function Select({
  value,
  onValueChange,
  options,
  label,
  name,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  name?: string;
  className?: string;
}) {
  return (
    <S.Root value={value} onValueChange={onValueChange} name={name}>
      <S.Trigger className={cx('wr-select', className)} aria-label={label}>
        <S.Value />
        <S.Icon>
          <ChevronDown size={15} />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content className="wr-select-menu" position="popper" sideOffset={6}>
          <S.Viewport>
            {options.map((option) => (
              <S.Item key={option.value} value={option.value} className="wr-select-item">
                <S.ItemText>{option.label}</S.ItemText>
                <S.ItemIndicator>
                  <Check size={15} />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
export function Tooltip({ children, label }: { children: ReactNode; label: string }) {
  return (
    <T.Provider delayDuration={250}>
      <T.Root>
        <T.Trigger asChild>{children}</T.Trigger>
        <T.Portal>
          <T.Content className="wr-tooltip" sideOffset={8}>
            {label}
            <T.Arrow className="wr-tooltip-arrow" />
          </T.Content>
        </T.Portal>
      </T.Root>
    </T.Provider>
  );
}
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  drawer = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  drawer?: boolean;
}) {
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="wr-overlay" />
        <D.Content
          className={cx('wr-dialog', drawer && 'wr-drawer')}
          onOpenAutoFocus={() => {
            returnFocus.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (returnFocus.current?.isConnected) returnFocus.current.focus();
          }}
        >
          <div className="wr-dialog-heading">
            <div>
              <D.Title>{title}</D.Title>
              <D.Description>{description}</D.Description>
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X size={19} />
              </Button>
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
export function Dropdown({
  trigger,
  items,
  label,
}: {
  trigger: ReactNode;
  label: string;
  items: { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean }[];
}) {
  return (
    <M.Root>
      <M.Trigger asChild>{trigger}</M.Trigger>
      <M.Portal>
        <M.Content className="wr-dropdown" align="end" sideOffset={8} aria-label={label}>
          {items.map((item) => (
            <M.Item
              className={cx('wr-dropdown-item', item.danger && 'text-negative')}
              key={item.label}
              onSelect={item.onSelect}
            >
              {item.icon}
              {item.label}
            </M.Item>
          ))}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="wr-empty">
      <span className="wr-empty-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function ColorDot({ color }: { color: string }) {
  return <span className="color-dot" style={{ '--dot-color': color } as CSSProperties} />;
}
export function Skeleton({ style }: { style?: CSSProperties }) {
  return <div className="wr-skeleton" style={style} aria-hidden="true" />;
}
