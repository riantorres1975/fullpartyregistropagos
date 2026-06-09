"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { BANCOS, MONEDAS } from "@/lib/bancos";
import { formatMonto, formatFecha } from "@/lib/format";
import { toast } from "@/lib/toast";
import ClienteCombobox from "@/components/ClienteCombobox";
import BancoSelect from "@/components/BancoSelect";
import { comprimirImagen, prepararParaOCR } from "@/lib/imagen";
import { analizarRecibo, type DatosRecibo } from "@/lib/ocr";
import { generarReciboBlob } from "@/lib/recibo";
import {
  IconPlus,
  IconX,
  IconCheck,
  IconCheckCircle,
  IconClock,
  IconPaperclip,
  IconPencil,
  IconTrash,
  IconFolder,
  IconCopy,
  IconImage,
} from "@/components/icons";

type CuentaOpt = {
  id: string;
  banco: string;
  tipo: string;
  enmascarado: string;
};

type ClienteConCuentas = {
  id: string;
  nombre: string;
  cuentas: CuentaOpt[];
};

type Transferencia = {
  id: string;
  fecha: string;
  monto: number;
  moneda: string;
  estado: string;
  referencia: string | null;
  bancoOrigen: string | null;
  bancoDestino: string | null;
  observaciones: string | null;
  tieneComprobante: boolean;
  clienteId: string | null;
  cliente: { id: string; nombre: string } | null;
  cuentaId: string | null;
  cuenta: { id: string; banco: string; enmascarado: string } | null;
};

type Resumen = Record<
  string,
  { pendiente: number; reflejada: number; total: number }
>;

function EstadoIcono({ estado }: { estado: string }) {
  return estado === "reflejada" ? (
    <IconCheckCircle className="h-3.5 w-3.5" />
  ) : (
    <IconClock className="h-3.5 w-3.5" />
  );
}

// Fecha local de HOY como "YYYY-MM-DD". Usamos los componentes locales (no
// toISOString, que da la fecha en UTC y de noche en CDMX salta al día siguiente).
const hoy = () => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
};

// Días transcurridos desde una fecha (para avisar de pendientes "viejas").
function diasDesde(fecha: string): number {
  const ms = Date.now() - new Date(fecha).getTime();
  return Math.floor(ms / 86_400_000);
}
// Una pendiente se marca como "atrasada" a partir de 3 días.
const DIAS_ALERTA = 3;

const formVacio = {
  fecha: hoy(),
  clienteId: "",
  cuentaId: "",
  monto: "",
  moneda: "MXN",
  bancoOrigen: "",
  bancoDestino: "",
  referencia: "",
  estado: "pendiente",
  observaciones: "",
  comprobante: "",
};

const pageSize = 25;

export default function TransferenciasPage() {
  const { mutate: globalMutate } = useSWRConfig();
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({
    q: "",
    estado: "",
    clienteId: "",
    desde: "",
    hasta: "",
  });
  const [form, setForm] = useState(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [editar, setEditar] = useState<Transferencia | null>(null);
  const [verComprobante, setVerComprobante] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const filtroRef = useRef<HTMLInputElement>(null);

  // Clientes: misma clave que en otras pantallas, así la caché se comparte.
  const { data: clientesData } = useSWR<ClienteConCuentas[]>("/api/clientes");
  const clientes: ClienteConCuentas[] = useMemo(
    () =>
      (clientesData ?? []).map((c) => ({
        id: c.id,
        nombre: c.nombre,
        cuentas: c.cuentas ?? [],
      })),
    [clientesData],
  );

  // Si llegamos desde "Movimientos" de un cliente (/transferencias?cliente=ID),
  // arrancamos con ese filtro puesto. Solo al cargar la página.
  useEffect(() => {
    const cid = new URLSearchParams(window.location.search).get("cliente");
    if (cid) {
      setFiltros((f) => ({ ...f, clienteId: cid }));
      setMostrarForm(false);
    }
  }, []);

  // Atajos de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Alt+N: mostrar/ocultar formulario de nueva transferencia
      if (e.altKey && (e.key === "n" || e.key === "N")) {
        e.preventDefault();
        setMostrarForm((v) => !v);
        return;
      }
      // Ctrl/Cmd+Enter: guardar el formulario
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }
      // "/": ir al buscador (si no estás escribiendo en un campo)
      const tag = (e.target as HTMLElement)?.tagName;
      const escribiendo = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (e.key === "/" && !escribiendo) {
        e.preventDefault();
        filtroRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Búsqueda por referencia con debounce (250 ms) para no pedir por tecla.
  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(filtros.q), 250);
    return () => clearTimeout(t);
  }, [filtros.q]);

  // Clave de la lista: cambia con página y filtros. SWR cachea cada
  // combinación, así volver a un filtro/página ya visto es instantáneo.
  const listKey = useMemo(() => {
    const sp = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (qDebounced) sp.set("q", qDebounced);
    if (filtros.estado) sp.set("estado", filtros.estado);
    if (filtros.clienteId) sp.set("clienteId", filtros.clienteId);
    if (filtros.desde) sp.set("desde", filtros.desde);
    if (filtros.hasta) sp.set("hasta", filtros.hasta);
    return `/api/transferencias?${sp.toString()}`;
  }, [page, qDebounced, filtros.estado, filtros.clienteId, filtros.desde, filtros.hasta]);

  const { data: listData, mutate: mutateList } = useSWR<{
    items: Transferencia[];
    total: number;
    resumen: Resumen;
  }>(listKey);
  const items = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const resumen = listData?.resumen ?? {};

  // Refresca la lista actual y marca el dashboard para revalidar.
  const cargar = async () => {
    await mutateList();
    globalMutate("/api/dashboard");
  };

  const cuentasDelCliente = (clienteId: string): CuentaOpt[] =>
    clientes.find((c) => c.id === clienteId)?.cuentas ?? [];

  // Al elegir cliente, si tiene una sola cuenta la selecciona sola
  // (y autocompleta el banco de destino con el de esa cuenta).
  function elegirCliente(clienteId: string) {
    const cuentas = cuentasDelCliente(clienteId);
    const unica = cuentas.length === 1 ? cuentas[0] : null;
    setForm((f) => ({
      ...f,
      clienteId,
      cuentaId: unica ? unica.id : "",
      bancoDestino: unica ? unica.banco : f.bancoDestino,
    }));
  }

  // Al elegir una cuenta/tarjeta, toma su banco como Banco Destino.
  function elegirCuenta(cuentaId: string) {
    const cuenta = cuentasDelCliente(form.clienteId).find((c) => c.id === cuentaId);
    setForm((f) => ({
      ...f,
      cuentaId,
      bancoDestino: cuenta ? cuenta.banco : f.bancoDestino,
    }));
  }

  async function crear(e: React.FormEvent, permitirDuplicado = false) {
    e.preventDefault();
    if (!form.monto) return;
    setGuardando(true);
    const res = await fetch("/api/transferencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, monto: parseFloat(form.monto), permitirDuplicado }),
    });
    setGuardando(false);
    if (res.ok) {
      setForm({ ...formVacio, fecha: hoy() });
      setPage(1);
      cargar();
      toast("Transferencia guardada");
      return;
    }
    const d = await res.json().catch(() => ({}));
    // 409: posible duplicado. Preguntamos y, si confirma, reintentamos forzando.
    if (res.status === 409 && d.duplicado && !permitirDuplicado) {
      if (confirm(d.error ?? "Parece un duplicado. ¿Registrar de todas formas?")) {
        crear(e, true);
      }
      return;
    }
    toast(d.error ?? "Error al guardar", "error");
  }

  async function toggleEstado(t: Transferencia) {
    const nuevo = t.estado === "pendiente" ? "reflejada" : "pendiente";
    await fetch(`/api/transferencias/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevo }),
    });
    cargar();
    toast(nuevo === "reflejada" ? "Marcada como reflejada" : "Marcada como pendiente");
  }

  // Prepara el formulario con los datos de otra transferencia para registrar
  // una parecida rápido (mismo cliente/cuenta/monto). Limpia ref y comprobante.
  function duplicar(t: Transferencia) {
    setForm({
      fecha: hoy(),
      clienteId: t.clienteId ?? "",
      cuentaId: t.cuentaId ?? "",
      monto: String(t.monto),
      moneda: t.moneda,
      bancoOrigen: t.bancoOrigen ?? "",
      bancoDestino: t.bancoDestino ?? "",
      referencia: "",
      estado: "pendiente",
      observaciones: t.observaciones ?? "",
      comprobante: "",
    });
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast("Datos copiados al formulario. Revisa y guarda.", "info");
  }

  async function eliminar(id: string) {
    if (!confirm("¿Mandar esta transferencia a la papelera?")) return;
    await fetch(`/api/transferencias/${id}`, { method: "DELETE" });
    cargar();
    toast("Movida a la papelera");
  }

  // Genera una imagen tipo comprobante y la comparte (WhatsApp, etc.) o, si el
  // dispositivo no soporta compartir archivos, la descarga.
  async function compartirRecibo(t: Transferencia) {
    try {
      const blob = await generarReciboBlob({
        fecha: formatFecha(t.fecha),
        cliente: t.cliente?.nombre ?? "Sin cliente",
        montoStr: formatMonto(t.monto, t.moneda),
        bancoDestino: t.bancoDestino ?? t.cuenta?.banco ?? null,
        cuenta: t.cuenta?.enmascarado ?? null,
        referencia: t.referencia,
        reflejada: t.estado === "reflejada",
      });
      const file = new File([blob], `comprobante-${t.id}.png`, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
      };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: "Comprobante",
            text: `Comprobante de ${formatMonto(t.monto, t.moneda)}`,
          });
        } catch {
          /* el usuario canceló: no hacemos nada */
        }
        return;
      }
      // Sin compartir nativo (escritorio): descargamos la imagen.
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `comprobante-${t.id}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Comprobante descargado");
    } catch {
      toast("No se pudo generar el comprobante", "error");
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));
  const cuentasForm = cuentasDelCliente(form.clienteId);
  const opcionesCliente = clientes.map((c) => ({ id: c.id, nombre: c.nombre }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Transferencias</h1>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="btn-primary"
            title="Atajo: Alt+N"
          >
            {mostrarForm ? (
              <>
                <IconX className="h-4 w-4" /> Ocultar formulario
              </>
            ) : (
              <>
                <IconPlus className="h-4 w-4" /> Nueva transferencia
              </>
            )}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Atajos: <kbd className="font-sans">Alt+N</kbd> nueva ·{" "}
          <kbd className="font-sans">Ctrl/⌘+Enter</kbd> guardar ·{" "}
          <kbd className="font-sans">/</kbd> buscar ·{" "}
          <kbd className="font-sans">Esc</kbd> cerrar
        </p>
      </div>

      {/* Formulario de registro */}
      {mostrarForm && (
        <form ref={formRef} onSubmit={crear} className="card grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">Fecha *</label>
            <input
              type="date"
              className="input"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Cliente</label>
            <ClienteCombobox
              clientes={opcionesCliente}
              value={form.clienteId}
              onChange={elegirCliente}
            />
          </div>
          <div>
            <label className="label">Cuenta / Tarjeta</label>
            <select
              className="input"
              value={form.cuentaId}
              onChange={(e) => elegirCuenta(e.target.value)}
              disabled={!form.clienteId}
            >
              {!form.clienteId ? (
                <option value="">Elige un cliente primero</option>
              ) : cuentasForm.length === 0 ? (
                <option value="">Este cliente no tiene cuentas guardadas</option>
              ) : (
                <>
                  <option value="">Sin especificar</option>
                  {cuentasForm.map((cu) => (
                    <option key={cu.id} value={cu.id}>
                      {cu.banco} · {cu.enmascarado}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="label">Monto *</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select
              className="input"
              value={form.moneda}
              onChange={(e) => setForm({ ...form, moneda: e.target.value })}
            >
              {MONEDAS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Banco Origen</label>
            <BancoSelect
              opciones={BANCOS}
              value={form.bancoOrigen}
              onChange={(b) => setForm({ ...form, bancoOrigen: b })}
            />
          </div>
          <div>
            <label className="label">Banco Destino</label>
            <BancoSelect
              opciones={BANCOS}
              value={form.bancoDestino}
              onChange={(b) => setForm({ ...form, bancoDestino: b })}
            />
          </div>
          <div>
            <label className="label">Referencia</label>
            <input
              className="input"
              value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })}
              placeholder="N° de referencia"
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              <option value="pendiente">Pendiente</option>
              <option value="reflejada">Reflejada</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observaciones</label>
            <textarea
              className="input"
              rows={2}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <IconPaperclip className="h-3.5 w-3.5" /> Comprobante (foto)
            </label>
            <ComprobanteCampo
              value={form.comprobante}
              onChange={(v) => setForm({ ...form, comprobante: v })}
              onExtract={(d) => {
                setForm((f) => ({
                  ...f,
                  monto: f.monto || (d.monto ? String(d.monto) : f.monto),
                  referencia: f.referencia || d.referencia || f.referencia,
                  bancoOrigen: f.bancoOrigen || d.banco || f.bancoOrigen,
                }));
                const partes: string[] = [];
                if (d.monto) partes.push("monto");
                if (d.referencia) partes.push("referencia");
                if (d.banco) partes.push("banco");
                toast(
                  partes.length
                    ? `Detectado del recibo: ${partes.join(", ")}`
                    : "No se detectaron datos en el recibo",
                  partes.length ? "ok" : "info",
                );
              }}
            />
            <p className="mt-1 text-xs text-slate-400">
              Al subir la foto, se intenta leer monto, referencia y banco.
            </p>
          </div>
          <div className="sm:col-span-3">
            <button className="btn-primary" disabled={guardando}>
              {guardando ? (
                "Guardando…"
              ) : (
                <>
                  <IconCheck className="h-4 w-4" /> Guardar transferencia
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Resumen de totales del listado filtrado */}
      {Object.keys(resumen).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(resumen).map(([moneda, r]) => (
            <div
              key={moneda}
              className="card flex-1 min-w-[200px] !p-4"
            >
              <p className="text-xs font-semibold text-slate-400">{moneda}</p>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="flex items-center gap-1 text-amber-600">
                  <IconClock className="h-4 w-4" /> {formatMonto(r.pendiente, moneda)}
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <IconCheckCircle className="h-4 w-4" /> {formatMonto(r.reflejada, moneda)}
                </span>
                <span className="font-semibold text-slate-700">
                  Σ {formatMonto(r.total, moneda)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="card grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ClienteCombobox
          clientes={opcionesCliente}
          value={filtros.clienteId}
          onChange={(id) => {
            setPage(1);
            setFiltros({ ...filtros, clienteId: id });
          }}
          placeholder="Filtrar por cliente…"
        />
        <input
          ref={filtroRef}
          className="input"
          placeholder="Buscar (referencia o monto)"
          value={filtros.q}
          onChange={(e) => {
            setPage(1);
            setFiltros({ ...filtros, q: e.target.value });
          }}
        />
        <select
          className="input"
          value={filtros.estado}
          onChange={(e) => {
            setPage(1);
            setFiltros({ ...filtros, estado: e.target.value });
          }}
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="reflejada">Reflejada</option>
        </select>
        <input
          type="date"
          className="input"
          value={filtros.desde}
          onChange={(e) => {
            setPage(1);
            setFiltros({ ...filtros, desde: e.target.value });
          }}
        />
        <input
          type="date"
          className="input"
          value={filtros.hasta}
          onChange={(e) => {
            setPage(1);
            setFiltros({ ...filtros, hasta: e.target.value });
          }}
        />
      </div>

      {/* Listado */}
      <div className="card">
        <p className="mb-2 text-sm text-slate-500">{total} registro(s)</p>

        {/* Vista de tarjetas (móvil) */}
        <div className="space-y-3 sm:hidden">
          {items.length === 0 ? (
            <p className="py-8 text-center text-slate-400">No hay transferencias.</p>
          ) : (
            items.map((t) => (
              <div
                key={t.id}
                className={`rounded-xl p-3 ring-1 ring-slate-200 dark:ring-slate-700 ${
                  t.estado === "reflejada"
                    ? "bg-green-50 dark:bg-green-900/25"
                    : "bg-amber-50 dark:bg-amber-900/25"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-400">{formatFecha(t.fecha)}</p>
                    {t.cliente ? (
                      <button
                        onClick={() => {
                          setPage(1);
                          setFiltros((f) => ({ ...f, clienteId: t.cliente!.id }));
                        }}
                        className="font-medium text-indigo-600 dark:text-indigo-400"
                      >
                        {t.cliente.nombre}
                      </button>
                    ) : (
                      <span className="font-medium">Sin cliente</span>
                    )}
                  </div>
                  <button
                    onClick={() => toggleEstado(t)}
                    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                      t.estado === "reflejada"
                        ? "bg-emerald-200 text-emerald-800"
                        : "bg-amber-200 text-amber-800"
                    }`}
                  >
                    <EstadoIcono estado={t.estado} />
                    {t.estado === "reflejada" ? "Reflejada" : "Pendiente"}
                  </button>
                </div>
                <p className="mt-1 text-xl font-bold">{formatMonto(t.monto, t.moneda)}</p>
                {t.cuenta && (
                  <p className="flex items-center gap-1 font-mono text-xs text-slate-500">
                    <IconFolder className="h-3.5 w-3.5" /> {t.cuenta.banco} ·{" "}
                    {t.cuenta.enmascarado}
                  </p>
                )}
                {t.referencia && (
                  <p className="text-xs text-slate-500">Ref: {t.referencia}</p>
                )}
                {t.estado === "pendiente" && diasDesde(t.fecha) >= DIAS_ALERTA && (
                  <p className="mt-1 flex items-center gap-1 text-xs font-medium text-orange-600">
                    <IconClock className="h-3.5 w-3.5" /> Pendiente hace{" "}
                    {diasDesde(t.fecha)} días
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {t.tieneComprobante && (
                    <button
                      onClick={() => setVerComprobante(t.id)}
                      className="btn-secondary flex-1 py-2 text-xs"
                    >
                      <IconPaperclip className="h-4 w-4" /> Ver
                    </button>
                  )}
                  <button
                    onClick={() => compartirRecibo(t)}
                    className="btn-secondary flex-1 py-2 text-xs"
                  >
                    <IconImage className="h-4 w-4" /> Recibo
                  </button>
                  <button
                    onClick={() => duplicar(t)}
                    className="btn-secondary flex-1 py-2 text-xs"
                  >
                    <IconCopy className="h-4 w-4" /> Duplicar
                  </button>
                  <button
                    onClick={() => setEditar(t)}
                    className="btn-secondary flex-1 py-2 text-xs"
                  >
                    <IconPencil className="h-4 w-4" /> Editar
                  </button>
                  <button
                    onClick={() => eliminar(t.id)}
                    className="btn-danger flex-1 py-2 text-xs"
                  >
                    <IconTrash className="h-4 w-4" /> Borrar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Tabla (escritorio) */}
        <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Fecha</th>
              <th>Cliente</th>
              <th>Cuenta / Tarjeta</th>
              <th>Monto</th>
              <th>Referencia</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  No hay transferencias.
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-slate-100 transition-colors hover:brightness-95 dark:border-slate-700 ${
                    t.estado === "reflejada"
                      ? "bg-green-50 dark:bg-green-900/25"
                      : "bg-amber-50 dark:bg-amber-900/25"
                  }`}
                >
                  <td className="py-2">
                    {formatFecha(t.fecha)}
                    {t.estado === "pendiente" && diasDesde(t.fecha) >= DIAS_ALERTA && (
                      <span
                        className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-semibold text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
                        title={`Pendiente hace ${diasDesde(t.fecha)} días`}
                      >
                        <IconClock className="h-3 w-3" />
                        {diasDesde(t.fecha)}d
                      </span>
                    )}
                  </td>
                  <td>
                    {t.cliente ? (
                      <button
                        onClick={() => {
                          setPage(1);
                          setFiltros((f) => ({ ...f, clienteId: t.cliente!.id }));
                        }}
                        className="text-left text-indigo-600 hover:underline dark:text-indigo-400"
                        title="Filtrar por este cliente"
                      >
                        {t.cliente.nombre}
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="font-mono text-xs">
                    {t.cuenta ? (
                      <span title={t.cuenta.banco}>{t.cuenta.enmascarado}</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="font-semibold">{formatMonto(t.monto, t.moneda)}</td>
                  <td className="text-slate-500">{t.referencia ?? "—"}</td>
                  <td>
                    <button
                      onClick={() => toggleEstado(t)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.estado === "reflejada"
                          ? "bg-emerald-200 text-emerald-800"
                          : "bg-amber-200 text-amber-800"
                      }`}
                      title="Clic para cambiar el estado"
                    >
                      <EstadoIcono estado={t.estado} />
                      {t.estado === "reflejada" ? "Reflejada" : "Pendiente"}
                    </button>
                  </td>
                  <td className="text-right">
                    {t.tieneComprobante && (
                      <button
                        onClick={() => setVerComprobante(t.id)}
                        className="mr-1 inline-flex rounded p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600"
                        title="Ver comprobante"
                      >
                        <IconPaperclip className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => compartirRecibo(t)}
                      className="mr-1 inline-flex rounded p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600"
                      title="Comprobante para el cliente (imagen)"
                    >
                      <IconImage className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => duplicar(t)}
                      className="mr-1 inline-flex rounded p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600"
                      title="Duplicar"
                    >
                      <IconCopy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditar(t)}
                      className="mr-1 inline-flex rounded p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600"
                      title="Editar"
                    >
                      <IconPencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => eliminar(t.id)}
                      className="inline-flex rounded p-1.5 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                      title="Eliminar"
                    >
                      <IconTrash className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>

        {totalPaginas > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm">
            <button
              className="btn-secondary px-3 py-1"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              ‹ Anterior
            </button>
            <span>
              Página {page} de {totalPaginas}
            </span>
            <button
              className="btn-secondary px-3 py-1"
              disabled={page >= totalPaginas}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente ›
            </button>
          </div>
        )}
      </div>

      {editar && (
        <EditarModal
          transferencia={editar}
          clientes={clientes}
          onClose={() => setEditar(null)}
          onSaved={() => {
            setEditar(null);
            cargar();
            toast("Cambios guardados");
          }}
        />
      )}

      {verComprobante && (
        <VisorComprobante
          id={verComprobante}
          onClose={() => setVerComprobante(null)}
        />
      )}
    </div>
  );
}

// Campo para subir/quitar la foto del comprobante (con vista previa).
// Si recibe onExtract, lee el recibo (OCR) y devuelve los datos detectados.
function ComprobanteCampo({
  value,
  onChange,
  onExtract,
}: {
  value: string;
  onChange: (v: string) => void;
  onExtract?: (datos: DatosRecibo) => void;
}) {
  const [procesando, setProcesando] = useState(false);
  const [ocr, setOcr] = useState<number | null>(null);
  const [ampliar, setAmpliar] = useState(false);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcesando(true);
    try {
      const dataUrl = await comprimirImagen(file);
      onChange(dataUrl);
      if (onExtract && dataUrl.startsWith("data:image")) {
        setOcr(0);
        try {
          // El OCR usa una versión preprocesada (ampliada + escala de grises)
          // del archivo original, no la WebP comprimida que se guarda.
          const ocrUrl = await prepararParaOCR(file);
          const datos = await analizarRecibo(ocrUrl, (p) => setOcr(p));
          onExtract(datos);
        } catch {
          toast("No se pudo leer el recibo", "error");
        } finally {
          setOcr(null);
        }
      }
    } catch {
      toast("No se pudo procesar la imagen", "error");
    } finally {
      setProcesando(false);
      e.target.value = "";
    }
  }

  if (value) {
    return (
      <div className="flex items-center gap-3">
        {value.startsWith("data:image") ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Comprobante"
              onClick={() => setAmpliar(true)}
              className="h-16 w-16 cursor-zoom-in rounded-lg object-cover ring-1 ring-slate-300"
              title="Clic para ampliar"
            />
            {ampliar && (
              <div
                className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4"
                onClick={() => setAmpliar(false)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="Comprobante" className="max-h-[90vh] max-w-full rounded-lg" />
              </div>
            )}
          </>
        ) : (
          <span className="flex items-center gap-1 text-sm">
            <IconFolder className="h-4 w-4" /> Archivo adjunto
          </span>
        )}
        {ocr !== null ? (
          <span className="text-xs text-slate-500">Leyendo recibo… {ocr}%</span>
        ) : (
          <button
            type="button"
            onClick={() => onChange("")}
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            Quitar
          </button>
        )}
      </div>
    );
  }

  return (
    <input
      type="file"
      accept="image/*"
      capture="environment"
      onChange={onFile}
      disabled={procesando}
      className="input file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-white"
    />
  );
}

// Modal que muestra la foto del comprobante (se carga al abrir).
function VisorComprobante({ id, onClose }: { id: string; onClose: () => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch(`/api/transferencias/${id}`)
      .then((r) => r.json())
      .then((t) => setSrc(t.comprobante ?? null))
      .finally(() => setCargando(false));
  }, [id]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] max-w-2xl overflow-auto rounded-2xl bg-white p-4 shadow-xl dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Comprobante</h3>
          <button onClick={onClose} className="btn-secondary px-3 py-1.5 text-xs">
            Cerrar
          </button>
        </div>
        {cargando ? (
          <p className="text-sm text-slate-500">Cargando…</p>
        ) : src ? (
          src.startsWith("data:image") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="Comprobante" className="max-w-full rounded-lg" />
          ) : (
            <a href={src} download className="btn-primary">
              Descargar archivo
            </a>
          )
        ) : (
          <p className="text-sm text-slate-400">Sin comprobante.</p>
        )}
      </div>
    </div>
  );
}

function EditarModal({
  transferencia,
  clientes,
  onClose,
  onSaved,
}: {
  transferencia: Transferencia;
  clientes: ClienteConCuentas[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fecha: transferencia.fecha.slice(0, 10),
    clienteId: transferencia.clienteId ?? "",
    cuentaId: transferencia.cuentaId ?? "",
    monto: String(transferencia.monto),
    moneda: transferencia.moneda,
    bancoOrigen: transferencia.bancoOrigen ?? "",
    bancoDestino: transferencia.bancoDestino ?? "",
    referencia: transferencia.referencia ?? "",
    estado: transferencia.estado,
    observaciones: transferencia.observaciones ?? "",
    comprobante: "",
  });
  const [guardando, setGuardando] = useState(false);
  // Evita borrar el comprobante si se guarda antes de que termine de cargar.
  const [compListo, setCompListo] = useState(!transferencia.tieneComprobante);

  // Carga el comprobante existente (si lo hay) al abrir el modal.
  useEffect(() => {
    if (!transferencia.tieneComprobante) return;
    fetch(`/api/transferencias/${transferencia.id}`)
      .then((r) => r.json())
      .then((t) => {
        if (t.comprobante) setForm((f) => ({ ...f, comprobante: t.comprobante }));
      })
      .catch(() => {})
      .finally(() => setCompListo(true));
  }, [transferencia.id, transferencia.tieneComprobante]);

  // Cerrar con la tecla Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cuentas =
    clientes.find((c) => c.id === form.clienteId)?.cuentas ?? [];
  const opcionesCliente = clientes.map((c) => ({ id: c.id, nombre: c.nombre }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const body: Record<string, unknown> = {
      ...form,
      monto: parseFloat(form.monto),
    };
    // Si el comprobante aún no terminó de cargar, no lo tocamos.
    if (!compListo) delete body.comprobante;
    await fetch(`/api/transferencias/${transferencia.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setGuardando(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={guardar}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800"
      >
        <h2 className="mb-4 text-lg font-bold">Editar transferencia</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Fecha</label>
            <input
              type="date"
              className="input"
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Cliente</label>
            <ClienteCombobox
              clientes={opcionesCliente}
              value={form.clienteId}
              onChange={(id) => {
                const cs = clientes.find((c) => c.id === id)?.cuentas ?? [];
                setForm((f) => ({
                  ...f,
                  clienteId: id,
                  cuentaId: cs.length === 1 ? cs[0].id : "",
                }));
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Cuenta / Tarjeta</label>
            <select
              className="input"
              value={form.cuentaId}
              onChange={(e) => {
                const cuentaId = e.target.value;
                const cuenta = cuentas.find((c) => c.id === cuentaId);
                setForm((f) => ({
                  ...f,
                  cuentaId,
                  bancoDestino: cuenta ? cuenta.banco : f.bancoDestino,
                }));
              }}
              disabled={!form.clienteId}
            >
              {!form.clienteId ? (
                <option value="">Elige un cliente primero</option>
              ) : cuentas.length === 0 ? (
                <option value="">Este cliente no tiene cuentas guardadas</option>
              ) : (
                <>
                  <option value="">Sin especificar</option>
                  {cuentas.map((cu) => (
                    <option key={cu.id} value={cu.id}>
                      {cu.banco} · {cu.enmascarado}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          <div>
            <label className="label">Monto</label>
            <input
              type="number"
              step="0.01"
              className="input"
              value={form.monto}
              onChange={(e) => setForm({ ...form, monto: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Moneda</label>
            <select
              className="input"
              value={form.moneda}
              onChange={(e) => setForm({ ...form, moneda: e.target.value })}
            >
              {MONEDAS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Referencia</label>
            <input
              className="input"
              value={form.referencia}
              onChange={(e) => setForm({ ...form, referencia: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input"
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
            >
              <option value="pendiente">Pendiente</option>
              <option value="reflejada">Reflejada</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Observaciones</label>
            <textarea
              className="input"
              rows={2}
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label flex items-center gap-1.5">
              <IconPaperclip className="h-3.5 w-3.5" /> Comprobante (foto)
            </label>
            <ComprobanteCampo
              value={form.comprobante}
              onChange={(v) => setForm({ ...form, comprobante: v })}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button className="btn-primary" disabled={guardando}>
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
