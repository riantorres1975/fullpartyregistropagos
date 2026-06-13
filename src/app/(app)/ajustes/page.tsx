"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/toast";
import { hashPin, PIN_HASH_KEY, PIN_OK_KEY } from "@/lib/pin";
import { tieneBio, bioDisponible, registrarBio, quitarBio } from "@/lib/bio";
import { descifrarTexto } from "@/lib/cifradoCliente";
import {
  IconLock,
  IconCheck,
  IconCard,
  IconDownload,
  IconSettings,
  IconWhatsApp,
  IconMail,
  IconFingerprint,
  IconCloud,
  IconClock,
  IconRestore,
} from "@/components/icons";

export default function AjustesPage() {
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <IconSettings className="h-6 w-6 text-violet-500" /> Ajustes
      </h1>
      <InstalarApp />
      <ResumenWhatsapp />
      <RespaldoDrive />
      <RespaldoCorreo />
      <RestaurarRespaldo />
      <CambiarContrasena />
      <CerrarSesiones />
      <ConfigurarPin />
      <ConfigurarHuella />
      <ActividadReciente />
    </div>
  );
}

// ─── Restaurar respaldo ──────────────────────────────────────────────────────
// Lee un archivo de respaldo (el JSON de la descarga/correo/Drive, o el cifrado
// con contraseña de Reportes) y lo restaura por lotes (Vercel limita el tamaño
// de cada petición). Es un upsert: actualiza lo existente, crea lo faltante.
function RestaurarRespaldo() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [procesando, setProcesando] = useState(false);
  const [progreso, setProgreso] = useState("");

  type Backup = {
    clientes?: unknown[];
    cuentas?: unknown[];
    transferencias?: unknown[];
  };

  async function enviarLote(lote: Backup): Promise<{ ok: boolean; error?: string }> {
    const res = await fetch("/api/restaurar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lote),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      return { ok: false, error: d.error ?? `Error ${res.status}` };
    }
    return { ok: true };
  }

  // Parte una lista en lotes de ~3 MB (las transferencias con comprobante
  // pueden pesar mucho cada una).
  function lotesPorTamano(items: unknown[], maxBytes = 3_000_000): unknown[][] {
    const lotes: unknown[][] = [];
    let actual: unknown[] = [];
    let bytes = 0;
    for (const item of items) {
      const peso = JSON.stringify(item).length;
      if (actual.length > 0 && bytes + peso > maxBytes) {
        lotes.push(actual);
        actual = [];
        bytes = 0;
      }
      actual.push(item);
      bytes += peso;
    }
    if (actual.length > 0) lotes.push(actual);
    return lotes;
  }

  async function onArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    setProcesando(true);
    setProgreso("Leyendo archivo…");
    try {
      let texto = await archivo.text();

      // ¿Es el respaldo cifrado con contraseña (de Reportes)? Pide la contraseña.
      try {
        const obj = JSON.parse(texto);
        if (obj && obj.salt && obj.iv && obj.data) {
          const pass = prompt("Este respaldo está protegido. Escribe su contraseña:");
          if (!pass) {
            setProcesando(false);
            setProgreso("");
            return;
          }
          setProgreso("Descifrando…");
          texto = await descifrarTexto(texto, pass);
        }
      } catch {
        // no era JSON: dejamos que truene abajo con mensaje claro
      }

      let backup: Backup;
      try {
        backup = JSON.parse(texto);
      } catch {
        throw new Error("El archivo no es un respaldo válido.");
      }
      const clientes = Array.isArray(backup.clientes) ? backup.clientes : [];
      const cuentas = Array.isArray(backup.cuentas) ? backup.cuentas : [];
      const transferencias = Array.isArray(backup.transferencias) ? backup.transferencias : [];
      if (clientes.length + cuentas.length + transferencias.length === 0) {
        throw new Error("El archivo no contiene datos para restaurar.");
      }

      const ok = confirm(
        `El respaldo trae:\n· ${clientes.length} clientes\n· ${cuentas.length} cuentas\n· ${transferencias.length} transferencias\n\nSe actualizará lo existente y se creará lo que falte (no se borra nada). ¿Restaurar?`,
      );
      if (!ok) {
        setProcesando(false);
        setProgreso("");
        return;
      }

      // Primero clientes y cuentas (las transferencias dependen de ellos).
      setProgreso("Restaurando clientes y cuentas…");
      const r1 = await enviarLote({ clientes, cuentas });
      if (!r1.ok) throw new Error(r1.error);

      const lotes = lotesPorTamano(transferencias);
      for (let i = 0; i < lotes.length; i++) {
        setProgreso(`Restaurando transferencias… (${i + 1} de ${lotes.length})`);
        const r = await enviarLote({ transferencias: lotes[i] });
        if (!r.ok) throw new Error(r.error);
      }

      setProgreso("");
      toast("Respaldo restaurado correctamente");
    } catch (err) {
      setProgreso("");
      toast(err instanceof Error ? err.message : "No se pudo restaurar", "error");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconRestore className="h-5 w-5 text-violet-500" /> Restaurar respaldo
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Sube un archivo de respaldo (el JSON descargado, el del correo o el de
        Google Drive; también el cifrado con contraseña). Lo existente se
        actualiza y lo faltante se crea; nada se borra. Solo funciona con
        respaldos de esta misma app.
      </p>
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onArchivo}
      />
      <button
        onClick={() => inputRef.current?.click()}
        className="btn-primary"
        disabled={procesando}
      >
        {procesando ? progreso || "Restaurando…" : "Elegir archivo de respaldo"}
      </button>
    </div>
  );
}

// ─── Actividad reciente (registro de auditoría) ──────────────────────────────
function ActividadReciente() {
  const [abierto, setAbierto] = useState(false);
  const [eventos, setEventos] = useState<
    { id: string; accion: string; entidad: string; detalle: string | null; createdAt: string }[] | null
  >(null);

  async function abrir() {
    setAbierto(true);
    const res = await fetch("/api/actividad");
    if (res.ok) {
      const d = await res.json();
      setEventos(d.eventos);
    } else {
      toast("No se pudo cargar la actividad", "error");
      setAbierto(false);
    }
  }

  function describir(e: { accion: string; entidad: string; detalle: string | null }): string {
    const que: Record<string, string> = {
      transferencia: "una transferencia",
      cliente: "un cliente",
      cuenta: "una cuenta",
      sesion: "la sesión",
      respaldo: "un respaldo",
    };
    const cosa = que[e.entidad] ?? e.entidad;
    switch (e.accion) {
      case "login":
        return "Inicio de sesión correcto";
      case "login_fallido":
        return `Intento de entrar FALLIDO${e.detalle ? ` (correo: ${e.detalle})` : ""}`;
      case "crear":
        return `Se registró ${cosa}${e.detalle ? ` · ${e.detalle}` : ""}`;
      case "editar":
        if (e.detalle === "cambio_contrasena") return "Se cambió la contraseña";
        if (e.detalle === "cerrar_sesiones") return "Se cerró la sesión en otros dispositivos";
        return `Se editó ${cosa}`;
      case "eliminar":
        return `Se mandó a la papelera ${cosa}`;
      case "restaurar":
        return `Se restauró ${cosa}${e.detalle ? ` (${e.detalle})` : ""}`;
      default:
        return `${e.accion} · ${cosa}`;
    }
  }

  const fmtFechaHora = (iso: string) =>
    new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconClock className="h-5 w-5 text-violet-500" /> Actividad reciente
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Todo lo que pasa en la app queda registrado: entradas, cambios, borrados
        e intentos fallidos de inicio de sesión.
      </p>
      {!abierto ? (
        <button onClick={abrir} className="btn-primary">
          Ver actividad
        </button>
      ) : eventos === null ? (
        <p className="text-sm text-slate-400">Cargando…</p>
      ) : eventos.length === 0 ? (
        <p className="text-sm text-slate-400">Sin actividad registrada.</p>
      ) : (
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm dark:divide-slate-700">
          {eventos.map((e) => (
            <li key={e.id} className="flex items-start justify-between gap-3 py-2">
              <span
                className={
                  e.accion === "login_fallido"
                    ? "font-medium text-red-600 dark:text-red-400"
                    : ""
                }
              >
                {describir(e)}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {fmtFechaHora(e.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Cerrar sesión en otros dispositivos ─────────────────────────────────────
// Útil si se perdió un teléfono con la sesión abierta: revoca todas las
// sesiones (la de este dispositivo se renueva sola y sigues dentro).
function CerrarSesiones() {
  const [procesando, setProcesando] = useState(false);

  async function cerrar() {
    if (!confirm("¿Cerrar la sesión en todos los demás dispositivos?")) return;
    setProcesando(true);
    const res = await fetch("/api/auth/cerrar-sesiones", { method: "POST" });
    setProcesando(false);
    if (res.ok) {
      toast("Listo: las sesiones en otros dispositivos quedaron cerradas");
    } else {
      toast("No se pudo completar; intenta de nuevo", "error");
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconLock className="h-5 w-5 text-violet-500" /> Cerrar sesión en otros dispositivos
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Si perdiste un teléfono o entraste desde una computadora ajena, esto
        cierra la sesión en todos lados menos aquí. Aquí sigues dentro.
      </p>
      <button onClick={cerrar} className="btn-primary" disabled={procesando}>
        {procesando ? "Cerrando…" : "Cerrar otras sesiones"}
      </button>
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

// ─── Respaldo automático a Google Drive (Apps Script) ────────────────────────
function RespaldoDrive() {
  const [enviando, setEnviando] = useState(false);

  async function probar() {
    setEnviando(true);
    try {
      const res = await fetch("/api/respaldo-drive");
      const d = await res.json().catch(() => ({}));
      if (res.ok) toast("Respaldo subido a tu Google Drive.");
      else toast(d.error ?? "No se pudo subir el respaldo", "error");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h2 className="flex items-center gap-2 font-semibold">
        <IconCloud className="h-5 w-5 text-violet-500" /> Respaldo a Google Drive
      </h2>
      <p className="text-sm text-slate-500">
        Cada domingo el respaldo completo se guarda solo en una carpeta de tu
        Google Drive (gratis). Se configura una sola vez con un pequeño “script”
        de Google. Pídeme los pasos exactos cuando quieras activarlo.
      </p>
      <button onClick={probar} className="btn-secondary" disabled={enviando}>
        <IconCloud className="h-4 w-4" />
        {enviando ? "Subiendo…" : "Subir un respaldo ahora"}
      </button>
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
