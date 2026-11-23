import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2 } from 'lucide-react';

export type PillButtonVariant = 'primary' | 'white' | 'secondary' | 'ghost' | 'danger';
export type PillButtonSize = 'sm' | 'md' | 'lg';

interface BaseProps {
  variant?: PillButtonVariant;
  size?: PillButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  hideIconCircle?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
}

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    to?: never;
  };

type ButtonAsLink = BaseProps & {
  to: string;
  disabled?: boolean;
};

export type PillButtonProps = ButtonAsButton | ButtonAsLink;

const CONTAINER_STYLES: Record<PillButtonVariant, string> = {
  primary:
    'bg-[#1E6BFF] text-white hover:bg-[#1554D9] shadow-cobalt active:scale-[0.99]',
  white:
    'bg-white text-[#0F172A] hover:bg-[#EFF4FB] shadow-soft active:scale-[0.99]',
  secondary:
    'bg-[#EFF4FB] text-[#1E6BFF] hover:bg-[#DBEAFE] border border-[#DBEAFE]/70',
  ghost:
    'bg-white text-[#0F172A] hover:bg-[#F4F7FC] border border-[#E2E8F0]',
  danger:
    'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/80',
};

const CIRCLE_STYLES: Record<PillButtonVariant, string> = {
  primary: 'bg-white text-[#1E6BFF]',
  white: 'bg-[#1E6BFF] text-white',
  secondary: 'bg-[#1E6BFF] text-white',
  ghost: 'bg-[#EFF4FB] text-[#1E6BFF]',
  danger: 'bg-red-600 text-white',
};

const SIZE_STYLES: Record<
  PillButtonSize,
  { wrapper: string; circle: string; icon: string }
> = {
  sm: {
    wrapper: 'h-9 pl-4 pr-1.5 text-xs font-medium gap-2.5',
    circle: 'h-6 w-6',
    icon: 'h-3.5 w-3.5',
  },
  md: {
    wrapper: 'h-11 pl-5 pr-1.5 text-sm font-medium gap-3',
    circle: 'h-8 w-8',
    icon: 'h-4 w-4',
  },
  lg: {
    wrapper: 'h-12 pl-6 pr-2 text-sm font-medium gap-3.5',
    circle: 'h-8 w-8',
    icon: 'h-4 w-4',
  },
};

export function PillButton(props: PillButtonProps) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    hideIconCircle = false,
    fullWidth = false,
    children,
    className = '',
  } = props;

  const sizeCfg = SIZE_STYLES[size];
  const paddingFallback = hideIconCircle ? 'px-5' : sizeCfg.wrapper;
  const baseClass = `inline-flex items-center justify-between rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6BFF]/50 disabled:opacity-55 disabled:pointer-events-none ${CONTAINER_STYLES[variant]} ${paddingFallback} ${
    hideIconCircle && size === 'sm' ? 'h-9 text-xs font-medium gap-2' : ''
  } ${hideIconCircle && size === 'md' ? 'h-11 text-sm font-medium gap-2' : ''} ${
    hideIconCircle && size === 'lg' ? 'h-12 text-sm font-medium gap-2' : ''
  } ${fullWidth ? 'w-full' : ''} ${className}`;

  const circleNode = !hideIconCircle && (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5 ${sizeCfg.circle} ${CIRCLE_STYLES[variant]}`}
    >
      {loading ? (
        <Loader2 className={`${sizeCfg.icon} animate-spin`} />
      ) : icon ? (
        icon
      ) : (
        <ArrowRight className={sizeCfg.icon} />
      )}
    </span>
  );

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={`group ${baseClass}`}>
        <span className="truncate">{children}</span>
        {circleNode}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    loading: _l,
    icon: _i,
    hideIconCircle: _h,
    fullWidth: _f,
    children: _c,
    className: _cl,
    ...rest
  } = props as ButtonAsButton;

  return (
    <button
      type={rest.type ?? 'button'}
      disabled={rest.disabled || loading}
      className={`group ${baseClass}`}
      {...rest}
    >
      <span className="truncate">{children}</span>
      {circleNode}
    </button>
  );
}
