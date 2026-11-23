import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const ICON_MAP: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLOR_MAP: Record<ToastType, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  error: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
  info: 'bg-[#EFF4FB] text-[#1E6BFF]',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, description }: Omit<ToastItem, 'id'>) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);
      window.setTimeout(() => removeToast(id), 4500);
    },
    [removeToast]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      success: (title, description) => showToast({ type: 'success', title, description }),
      error: (title, description) => showToast({ type: 'error', title, description }),
      warning: (title, description) => showToast({ type: 'warning', title, description }),
      info: (title, description) => showToast({ type: 'info', title, description }),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[90] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
      >
        {toasts.map((toast) => {
          const Icon = ICON_MAP[toast.type];
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-[20px] bg-white/95 backdrop-blur-md border border-[#E2E8F0] p-3.5 shadow-soft transition-all"
            >
              <div
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${COLOR_MAP[toast.type]}`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#0F172A] leading-snug">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-[#64748B] leading-relaxed">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar notificação"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#64748B] hover:bg-[#EFF4FB] hover:text-[#0F172A] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast deve ser utilizado dentro de ToastProvider');
  }
  return ctx;
}
