'use client';

import { useEffect, useState, useCallback } from 'react';
import { X } from 'lucide-react';

/**
 * Visual severity of a toast notification.
 * @since 1.0.0
 * Maps to `success` (green), `error` (red), or `info` (blue) background.
 */
export type ToastType = 'success' | 'error' | 'info';

/** Internal shape of a single queued toast; `id` is an auto-incrementing counter used as the React key. */
interface ToastMessage {
  /** Auto-incrementing counter used as the React list key and for targeted removal. */
  id: number;
  /** Severity level — drives background colour in `bgColor` map. */
  type: ToastType;
  /** Human-readable message shown in the toast body. */
  message: string;
}

let toastId = 0;
let addToastFn: ((type: ToastType, message: string) => void) | null = null;

/**
 * Show a toast notification from anywhere in the app — no React context needed.
 *
 * Typical Celo use-cases: transaction success ("Task accepted on Celo!"),
 * wallet errors ("Insufficient USDC balance"), and IPFS upload failures.
 * Toasts auto-dismiss after 5 s or can be closed manually.
 *
 * Requires `<ToastContainer>` to be mounted once in the layout root.
 */
export function toast(type: ToastType, message: string) {
  addToastFn?.(type, message);
}

/**
 * Mount once at the layout root (next to `<Header>`).
 * Renders a fixed stack of toast messages in the bottom-right corner.
 * Uses a module-level singleton (`addToastFn`) so `toast()` above can
 * enqueue messages from outside the React tree (e.g. wagmi callbacks).
 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    addToastFn = addToast;
    return () => {
      addToastFn = null;
    };
  }, [addToast]);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const bgColor = {
    success: 'bg-green-600/90',
    error: 'bg-red-600/90',
    info: 'bg-blue-600/90',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`${bgColor[t.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[400px] animate-slide-in`}
        >
          <span className="flex-1 text-sm">{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="hover:opacity-70">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
