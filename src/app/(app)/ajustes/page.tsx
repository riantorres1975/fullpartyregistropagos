"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { hashPin, PIN_HASH_KEY, PIN_OK_KEY } from "@/lib/pin";
import { tieneBio, bioDisponible, registrarBio, quitarBio } from "@/lib/bio";
import {
  IconLock,
  IconCheck,
  IconCard,
  IconDownload,
  IconSettings,
  IconWhatsApp,
  IconMail,
  IconFingerprint,
} from "@/components/icons";

export default function AjustesPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <IconSettings className="h-6 w-6 text-violet-500" /> Ajustes
      </h1>
      <InstalarApp />
      <ResumenWhatsapp />
      <RespaldoCorreo />
      <CambiarContrasena />
      <ConfigurarPin />
      <ConfigurarHuella />
    </div>
  );
}

// ─── Desbloqueo con huella / rostro (WebAuthn local) ─────────────────────────
function ConfigurarHuella() {
  const [disponible, setDisponible] = useState<boolean | null>(null);
  const [tiene, setTiene] = useState(false);
  const [procesando, setProcesando] = useState(false);

  useEffect(() => {
    setTiene(tieneBio());
    bioDisponible().then(setDisponible);
  }, []);

  async function activar() {
    setProcesando(true);
    try {
      const ok = await registrarBio();
      if (ok) {
        setTiene(true);
        toast("Huella activada en este dispositivo");
      } else {
        toast("No se pudo activar la huella", "error");
      }
    } finally {
      setProcesando(false);
    }
  }

  function quitar() {
    if (!confirm("¿Quitar el desbloqueo con huella?")) return;
    quitarBio();
    setTiene(false);
    toast("Huella quitada");
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconFingerprint className="h-5 w-5 text-violet-500" /> Desbloqueo con
        huella
      </h2>
      <p className="text-sm text-slate-500">
        Abre la app con la huella o el rostro de este dispositivo (igual que el
        PIN, pero más rápido).
      </p>
      {disponible === false ? (
        <p className="text-sm text-amber-600">
          Este dispositivo o navegador no tiene huella/rostro disponible.
        </p>
      ) : tiene ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <IconCheck className="h-4 w-4" /> Huella activada en este dispositivo
          </span>
          <button onClick={quitar} className="btn-danger px-3 py-1.5 text-sm">
            Quitar huella
          </button>
        </div>
      ) : (
        <button
          onClick={activar}
          className="btn-primary"
          disabled={procesando || disponible === null}
        >
          <IconFingerprint className="h-4 w-4" />
          {procesando ? "Activando…" : "Activar huella"}
        </button>
      )}
    </div>
  );
}

// ─── Respaldo automático por correo (Resend) ─────────────────────────────────
function RespaldoCorreo() {
  const [enviando, setEnviando] = useState(false);

  async function probar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/respaldo-correo");
      const d = await res.json().catch(() => ({}));
      if (res.ok) toast("Respaldo enviado a tu correo.");
      else toast(d.error ?? "No se pudo enviar el respaldo", "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconMail className="h-5 w-5 text-violet-500" /> Respaldo automático por
        correo
      </h2>
      <p className="text-sm text-slate-500">
        Cada domingo te llega el respaldo completo a tu correo (gratis con
        Resend). Configúralo una sola vez:
      </p>
      <ol className="ml-4 list-decimal space-y-1 text-sm text-slate-500">
        <li>
          Crea una cuenta gratis en{" "}
          <strong>resend.com</strong> con tu mismo correo.
        </li>
        <li>
          En “API Keys” genera una clave y pásamela junto con el correo donde
          quieres recibir el respaldo.
        </li>
        <li>
          La guardo en el servidor (variables <code>RESEND_API_KEY</code> y{" "}
          <code>BACKUP_EMAIL</code>).
        </li>
      </ol>
      <button onClick={probar} className="btn-secondary" disabled={enviando}>
        <IconMail className="h-4 w-4" />
        {enviando ? "Enviando…" : "Enviarme un respaldo ahora"}
      </button>
    </div>
  );
}

// ─── Resúmenes por WhatsApp (CallMeBot) ──────────────────────────────────────
function ResumenWhatsapp() {
  const [enviando, setEnviando] = useState<string | null>(null);

  async function enviar(url: string, etiqueta: string) {
    setEnviando(etiqueta);
    try {
      const res = await fetch(url);
      const d = await res.json().catch(() => ({}));
      if (res.ok) toast(d.mensaje?.includes("no se envió") ? d.mensaje : "Enviado. Revisa tu WhatsApp.");
      else toast(d.error ?? "No se pudo enviar", "error");
    } finally {
      setEnviando(null);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconWhatsApp className="h-5 w-5 text-green-600" /> Resúmenes por WhatsApp
      </h2>
      <p className="text-sm text-slate-500">
        Recibes el resumen <strong>diario a las 7:00 p.m.</strong> y el{" "}
        <strong>semanal los domingos</strong>, automáticamente. Desde aquí puedes
        enviar cualquiera al instante:
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => enviar("/api/resumen-diario", "dia")}
          className="btn-secondary"
          disabled={!!enviando}
        >
          <IconWhatsApp className="h-4 w-4 text-green-600" />
          {enviando === "dia" ? "Enviando…" : "Resumen del día"}
        </button>
        <button
          onClick={() => enviar("/api/resumen-diario?periodo=semana", "semana")}
          className="btn-secondary"
          disabled={!!enviando}
        >
          <IconWhatsApp className="h-4 w-4 text-green-600" />
          {enviando === "semana" ? "Enviando…" : "De la semana"}
        </button>
        <button
          onClick={() => enviar("/api/resumen-diario?periodo=mes", "mes")}
          className="btn-secondary"
          disabled={!!enviando}
        >
          <IconWhatsApp className="h-4 w-4 text-green-600" />
          {enviando === "mes" ? "Enviando…" : "Del mes"}
        </button>
        <button
          onClick={() => enviar("/api/resumen-diario?tipo=atrasadas", "atrasadas")}
          className="btn-secondary"
          disabled={!!enviando}
        >
          <IconWhatsApp className="h-4 w-4 text-amber-600" />
          {enviando === "atrasadas" ? "Enviando…" : "Solo atrasadas"}
        </button>
      </div>
      <p className="text-xs text-slate-400">
        Si configuras una nueva apikey de CallMeBot, pásamela para actualizarla en
        el servidor.
      </p>
    </div>
  );
}

// ─── Instalar como app (PWA) ────────────────────────────────────────────────
function InstalarApp() {
  const [puede, setPuede] = useState(false);
  const [instalada, setInstalada] = useState(false);

  useEffect(() => {
    const w = window as unknown as { __deferredInstall?: Event };
    setPuede(!!w.__deferredInstall);
    setInstalada(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        // iOS
        (navigator as unknown as { standalone?: boolean }).standalone === true,
    );
    const onInstallable = () => setPuede(true);
    const onInstalled = () => {
      setInstalada(true);
      setPuede(false);
    };
    window.addEventListener("pwa-installable", onInstallable);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("pwa-installable", onInstallable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function instalar() {
    const w = window as unknown as {
      __deferredInstall?: Event & {
        prompt: () => void;
        userChoice: Promise<{ outcome: string }>;
      };
    };
    const ev = w.__deferredInstall;
    if (!ev) return;
    ev.prompt();
    try {
      await ev.userChoice;
    } finally {
      w.__deferredInstall = undefined;
      setPuede(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconCard className="h-5 w-5 text-violet-500" /> Instalar la app
      </h2>
      {instalada ? (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <IconCheck className="h-4 w-4" /> Ya está instalada en este dispositivo.
        </p>
      ) : puede ? (
        <>
          <p className="text-sm text-slate-500">
            Añádela a tu pantalla de inicio para abrirla como una app normal, a
            pantalla completa.
          </p>
          <button onClick={instalar} className="btn-primary">
            <IconDownload className="h-4 w-4" /> Instalar app
          </button>
        </>
      ) : (
        <div className="space-y-1 text-sm text-slate-500">
          <p>Para instalarla en tu teléfono:</p>
          <p>
            <strong>Android (Chrome):</strong> menú ⋮ → “Instalar app” o “Agregar
            a pantalla principal”.
          </p>
          <p>
            <strong>iPhone (Safari):</strong> botón Compartir → “Agregar a inicio”.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Cambiar contraseña ──────────────────────────────────────────────────────
function CambiarContrasena() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (nueva !== repetir) {
      toast("Las contraseñas nuevas no coinciden", "error");
      return;
    }
    if (nueva.length < 8) {
      toast("La nueva contraseña debe tener al menos 8 caracteres", "error");
      return;
    }
    setGuardando(true);
    const res = await fetch("/api/auth/cambiar-contrasena", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual, nueva }),
    });
    setGuardando(false);
    if (res.ok) {
      setActual("");
      setNueva("");
      setRepetir("");
      toast("Contraseña actualizada");
    } else {
      const d = await res.json().catch(() => ({}));
      toast(d.error ?? "No se pudo cambiar la contraseña", "error");
    }
  }

  return (
    <form onSubmit={enviar} className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconLock className="h-5 w-5 text-violet-500" /> Cambiar contraseña
      </h2>
      <div>
        <label className="label">Contraseña actual</label>
        <input
          type="password"
          className="input"
          autoComplete="current-password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Nueva contraseña</label>
          <input
            type="password"
            className="input"
            autoComplete="new-password"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Repetir nueva</label>
          <input
            type="password"
            className="input"
            autoComplete="new-password"
            value={repetir}
            onChange={(e) => setRepetir(e.target.value)}
            required
          />
        </div>
      </div>
      <button className="btn-primary" disabled={guardando}>
        {guardando ? "Guardando…" : "Actualizar contraseña"}
      </button>
    </form>
  );
}

// ─── PIN de bloqueo rápido ───────────────────────────────────────────────────
function ConfigurarPin() {
  const [tiene, setTiene] = useState(false);
  const [pin, setPin] = useState("");
  const [repetir, setRepetir] = useState("");

  useEffect(() => {
    try {
      setTiene(!!localStorage.getItem(PIN_HASH_KEY));
    } catch {
      /* sin storage */
    }
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) {
      toast("El PIN debe tener al menos 4 dígitos", "error");
      return;
    }
    if (pin !== repetir) {
      toast("Los PIN no coinciden", "error");
      return;
    }
    const hash = await hashPin(pin);
    localStorage.setItem(PIN_HASH_KEY, hash);
    sessionStorage.setItem(PIN_OK_KEY, "1");
    setTiene(true);
    setPin("");
    setRepetir("");
    toast("PIN activado");
  }

  function quitar() {
    if (!confirm("¿Quitar el PIN de bloqueo?")) return;
    localStorage.removeItem(PIN_HASH_KEY);
    sessionStorage.removeItem(PIN_OK_KEY);
    setTiene(false);
    toast("PIN quitado");
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconLock className="h-5 w-5 text-violet-500" /> PIN de bloqueo rápido
      </h2>
      <p className="text-sm text-slate-500">
        Pide un PIN al abrir la app en este dispositivo (además de tu sesión).
        Útil si compartes o pierdes el teléfono.
      </p>
      {tiene ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <IconCheck className="h-4 w-4" /> PIN activado en este dispositivo
          </span>
          <button onClick={quitar} className="btn-danger px-3 py-1.5 text-sm">
            Quitar PIN
          </button>
        </div>
      ) : (
        <form onSubmit={guardar} className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Nuevo PIN (mín. 4 dígitos)</label>
            <input
              type="password"
              inputMode="numeric"
              className="input tracking-[0.3em]"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              maxLength={12}
              placeholder="••••"
            />
          </div>
          <div>
            <label className="label">Repetir PIN</label>
            <input
              type="password"
              inputMode="numeric"
              className="input tracking-[0.3em]"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              maxLength={12}
              placeholder="••••"
            />
          </div>
          <div className="sm:col-span-2">
            <button className="btn-primary">
              <IconCheck className="h-4 w-4" /> Activar PIN
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
