"use client";

import { useEffect, useState } from "react";
import { hashPin, PIN_HASH_KEY, PIN_OK_KEY } from "@/lib/pin";
import { tieneBio, desbloquearBio } from "@/lib/bio";
import { IconLock, IconFingerprint } from "@/components/icons";

// Candado local opcional: si hay PIN y/o huella configurados y no se ha
// desbloqueado en esta sesión del navegador, pide desbloquear antes de mostrar
// la app.
export default function PinGate({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<"cargando" | "abierto" | "bloqueado">(
    "cargando",
  );
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [hayPin, setHayPin] = useState(false);
  const [hayBio, setHayBio] = useState(false);

  useEffect(() => {
    let hash: string | null = null;
    let ok: string | null = null;
    try {
      hash = localStorage.getItem(PIN_HASH_KEY);
      ok = sessionStorage.getItem(PIN_OK_KEY);
    } catch {
      /* sin storage: no bloquear */
    }
    const conPin = !!hash;
    const conBio = tieneBio();
    setHayPin(conPin);
    setHayBio(conBio);
    if ((!conPin && !conBio) || ok === "1") {
      setEstado("abierto");
    } else {
      setEstado("bloqueado");
      // Si hay huella, la ofrecemos de inmediato (sin tapar la opción de PIN).
      if (conBio) intentarHuella();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function intentarHuella() {
    const ok = await desbloquearBio();
    if (ok) {
      setEstado("abierto");
      setError(false);
    }
  }

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
        <h1 className="text-lg font-bold">
          {hayPin ? "Ingresa tu PIN" : "Desbloquea la app"}
        </h1>

        {hayPin && (
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
        )}

        {hayBio && (
          <button
            onClick={intentarHuella}
            className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-medium text-violet-700 shadow ring-1 ring-violet-200 hover:bg-violet-50 dark:bg-slate-800 dark:text-violet-300 dark:ring-slate-700"
          >
            <IconFingerprint className="h-6 w-6" /> Usar huella
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
