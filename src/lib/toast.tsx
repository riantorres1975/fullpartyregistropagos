"use client";

import { useEffect, useState } from "react";

type ToastType = "ok" | "error" | "info";
type ToastItem = { id: number; message: string; type: ToastType };

// Lanza un aviso desde cualquier parte: toast("Guardado")
export function toast(message: string, type: ToastType = "ok") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("app-toast", { detail: { message, type } }),
  );
}

const estilos: Record<ToastType, string> = {
  ok: "bg-green-600",
  error: "bg-red-600",
  info: "bg-slate-800",
};

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    let contador = 0;
    function onToast(e: Event) {
      const { message, type } = (e as CustomEvent).detail as {
        message: string;
        type: ToastType;
      };
      const id = ++contador;
      setItems((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id));
      }, 2800);
    }
    window.addEventListener("app-toast", onToast);
    return () => window.removeEventListener("app-toast", onToast);
  }, []);

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] flex w-full max-w-xs -translate-x-1/2 flex-col gap-2 px-4">
      {items.map((t) => (
        <div
          key={t.id}
          className={`rounded-lg px-4 py-3 text-center text-sm font-medium text-white shadow-lg ${estilos[t.type]}`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
