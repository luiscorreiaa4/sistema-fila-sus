import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: ReactNode;
  footer?: ReactNode;
}

const SIZE_CLASS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  size = 'md',
  children,
  footer,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0F172A]/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${SIZE_CLASS[size]} max-h-[90vh] flex flex-col rounded-[24px] bg-white border border-[#E2E8F0] shadow-soft overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 border-b border-[#E2E8F0]">
          <div className="min-w-0">
            <h2
              id="modal-title"
              className="font-display text-base sm:text-lg font-semibold text-[#0F172A] break-words"
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-1 text-xs text-[#64748B] leading-relaxed break-words">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EFF4FB] text-[#64748B] hover:text-[#0F172A] hover:bg-[#DBEAFE] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
          {children}
        </div>

        {footer && (
          <div className="px-4 sm:px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
