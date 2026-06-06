"use client";

import { useEffect, useState } from "react";
import { hashPin, PIN_HASH_KEY, PIN_OK_KEY } from "@/lib/pin";
import { IconLock } from "@/components/icons";

// Candado local opcional: si hay un PIN configurado y no se ha desbloqueado en
// esta sesión del navegador, pide el PIN antes de mostrar la app.
export default function PinGate({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<"cargando" | "abierto" | "bloqueado">(
    "cargando",
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let hash: string | null = null;
    let ok: string | null = null;
    try {
      hash = localStorage.getItem(PIN_HASH_KEY);
      ok = sessionStorage.getItem(PIN_OK_KEY);
    } catch {
      /* sin storage: no bloquear */
    }
    if (!hash || ok === "1") setEstado("abierto");
    else setEstado("bloqueado");
  }, []);

  async function comprobar(e: React.FormEvent) {
    e.preventDefault();
    const hash = await hashPin(pin);
    if (hash === localStorage.getItem(PIN_HASH_KEY)) {
      sessionStorage.setItem(PIN_OK_KEY, "1");
      setEstado("abierto");
      setPin("");
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (estado === "cargando") {
    return <div className="min-h-screen bg-[#f4f1ec] dark:bg-[#0e0c15]" />;
  }

  if (estado === "bloqueado") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#f4f1ec] p-6 dark:bg-[#0e0c15]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6d28d9_0%,#db2777_100%)] text-white shadow-lg shadow-violet-600/30">
          <IconLock className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-bold">Ingresa tu PIN</h1>
        <form onSubmit={comprobar} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => {
              setPin(e.target.value);
              setError(false);
            }}
            className="input text-center text-2xl tracking-[0.5em]"
            placeholder="••••"
            maxLength={12}
          />
          {error && (
            <p className="text-center text-sm text-rose-600">PIN incorrecto</p>
          )}
          <button className="btn-primary w-full" disabled={pin.length < 4}>
            Desbloquear
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
