import React from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import type { Toast as ToastItem } from "@/hooks/useToast";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const config = {
  success: {
    icon: <CheckCircle size={16} />,
    bg: "bg-emerald-50 border-emerald-200",
    text: "text-emerald-800",
    icon_class: "text-emerald-500",
  },
  error: {
    icon: <AlertCircle size={16} />,
    bg: "bg-rose-50 border-rose-200",
    text: "text-rose-800",
    icon_class: "text-rose-500",
  },
  warning: {
    icon: <AlertTriangle size={16} />,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    icon_class: "text-amber-500",
  },
  info: {
    icon: <Info size={16} />,
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    icon_class: "text-blue-500",
  },
};

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm w-full">
      {toasts.map((t) => {
        const c = config[t.type];
        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${c.bg} ${c.text}`}
            style={{ animation: "toastIn 0.2s ease-out" }}
          >
            <span className={`mt-0.5 shrink-0 ${c.icon_class}`}>{c.icon}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => onDismiss(t.id)}
              className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
