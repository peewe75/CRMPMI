'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (input: { type: ToastType; title: string; description?: string }) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    ({ type, title, description }: { type: ToastType; title: string; description?: string }) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, type, title, description }]);
      const timer = window.setTimeout(() => removeToast(id), 4000);
      timersRef.current.set(id, timer);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 md:bottom-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex w-80 items-start gap-3 rounded-lg border border-border bg-white p-4 shadow-lg"
            style={{ animation: 'toast-slide-in 0.3s ease-out' }}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
            ) : toast.type === 'error' ? (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            ) : (
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900">{toast.title}</p>
              {toast.description && (
                <p className="mt-0.5 text-xs text-gray-500">{toast.description}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-gray-400 transition hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
