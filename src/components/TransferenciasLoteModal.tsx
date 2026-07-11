"use client";

import { useState } from "react";
import ClienteCombobox from "@/components/ClienteCombobox";
import {
  IconCheck,
  IconCheckCircle,
  IconClock,
  IconFolder,
  IconImage,
  IconTrash,
  IconX,
} from "@/components/icons";
import { comprimirImagen, prepararParaOCR } from "@/lib/imagen";
import { analizarRecibos } from "@/lib/ocr";
import { formatMonto } from "@/lib/format";
import { toast } from "@/lib/toast";

type CuentaLote = {
  id: string;
  banco: string;
  enmascarado: string;
};

export type ClienteLote = {
  id: string;
  nombre: string;
  cuentas: CuentaLote[];
};

type EstadoLectura = "pendiente" | "leyendo" | "listo" | "error";

type ItemLote = {
  id: string;
  nombreArchivo: string;
  comprobante: string;
  fecha: string;
  monto: string;
  referencia: string;
  bancoOrigen: string;
  verificado: boolean;
  estadoLectura: EstadoLectura;
  progreso: number;
};

const MAX_ARCHIVOS = 20;

function fechaHoy() {
  const fecha = new Date();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function nuevoItem(file: File, index: number): ItemLote {
  return {
    id: `${Date.now()}-${index}-${file.name}`,
    nombreArchivo: file.name,
    comprobante: "",
    fecha: fechaHoy(),
    monto: "",
    referencia: "",
    bancoOrigen: "",
    verificado: false,
    estadoLectura: "pendiente",
    progreso: 0,
  };
}

export default function TransferenciasLoteModal({
  clientes,
  onClose,
  onSaved,
}: {
  clientes: ClienteLote[];
  onClose: () => void;
  onSaved: (cantidad: number) => void;
}) {
  const [clienteId, setClienteId] = useState("");
  const [cuentaId, setCuentaId] = useState("");
  const [estadoLote, setEstadoLote] = useState<"pendiente" | "reflejada">(
    "pendiente",
  );
  const [items, setItems] = useState<ItemLote[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [ampliada, setAmpliada] = useState<string | null>(null);
  const [duplicados, setDuplicados] = useState<Set<number>>(new Set());

  const cliente = clientes.find((item) => item.id === clienteId);
  const cuentas = cliente?.cuentas ?? [];
  const cuenta = cuentas.find((item) => item.id === cuentaId);
  const opcionesCliente = clientes.map((item, index) => ({
    id: item.id,
    nombre: item.nombre,
    frecuente: index < 5,
  }));

  const verificados = items.filter((item) => item.verificado).length;
  const montosValidos = items.every(
    (item) => Number.isFinite(Number(item.monto)) && Number(item.monto) > 0,
  );
  const comprobantesListos = items.every((item) => !!item.comprobante);
  const total = items.reduce((suma, item) => suma + (Number(item.monto) || 0), 0);
  const cuentaValida = cuentas.length <= 1 || !!cuentaId;
  const puedeGuardar =
    !!clienteId &&
    cuentaValida &&
    items.length > 0 &&
    montosValidos &&
    comprobantesListos &&
    verificados === items.length &&
    !procesando &&
    !guardando;

  function actualizar(id: string, cambios: Partial<ItemLote>) {
    setItems((actuales) =>
      actuales.map((item) => (item.id === id ? { ...item, ...cambios } : item)),
    );
  }

  function elegirCliente(id: string) {
    const nuevasCuentas = clientes.find((item) => item.id === id)?.cuentas ?? [];
    setClienteId(id);
    setCuentaId(nuevasCuentas.length === 1 ? nuevasCuentas[0].id : "");
  }

  async function agregarArchivos(evento: React.ChangeEvent<HTMLInputElement>) {
    const disponibles = MAX_ARCHIVOS - items.length;
    const seleccionados = Array.from(evento.target.files ?? []);
    const archivos = seleccionados.slice(0, disponibles);
    evento.target.value = "";
    if (archivos.length === 0) return;
    if (archivos.length < seleccionados.length) {
      toast(`El límite es de ${MAX_ARCHIVOS} comprobantes por lote`, "error");
    }

    const nuevos = archivos.map(nuevoItem);
    setItems((actuales) => [...actuales, ...nuevos]);
    setProcesando(true);

    const lecturas: { id: string; dataUrl: string }[] = [];
    for (let index = 0; index < archivos.length; index++) {
      const archivo = archivos[index];
      const item = nuevos[index];
      try {
        const comprobante = await comprimirImagen(archivo);
        const preparada = await prepararParaOCR(archivo);
        lecturas.push({ id: item.id, dataUrl: preparada });
        actualizar(item.id, {
          comprobante,
          estadoLectura: "leyendo",
          progreso: 0,
        });
      } catch {
        actualizar(item.id, { estadoLectura: "error" });
      }
    }

    if (lecturas.length > 0) {
      try {
        const resultados = await analizarRecibos(
          lecturas.map((lectura) => lectura.dataUrl),
          (indice, progreso) => actualizar(lecturas[indice].id, { progreso }),
        );
        resultados.forEach((datos, index) => {
          actualizar(
            lecturas[index].id,
            datos
              ? {
                  monto: datos.monto ? String(datos.monto) : "",
                  referencia: datos.referencia ?? "",
                  bancoOrigen: datos.banco ?? "",
                  estadoLectura: "listo",
                  progreso: 100,
                }
              : { estadoLectura: "error" },
          );
        });
      } catch {
        lecturas.forEach((lectura) =>
          actualizar(lectura.id, { estadoLectura: "error" }),
        );
        toast("No se pudo iniciar la lectura de los comprobantes", "error");
      }
    }

    setProcesando(false);
  }

  function quitar(id: string) {
    setItems((actuales) => actuales.filter((item) => item.id !== id));
    setDuplicados(new Set());
  }

  function cerrar() {
    if (procesando || guardando) return;
    if (items.length > 0 && !confirm("¿Cerrar y descartar este lote?")) return;
    onClose();
  }

  async function guardar(permitirDuplicados = false) {
    if (!puedeGuardar && !permitirDuplicados) return;
    setGuardando(true);
    setDuplicados(new Set());

    let respuesta: Response;
    try {
      respuesta = await fetch("/api/transferencias/lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clienteId,
          cuentaId: cuentaId || null,
          permitirDuplicados,
          transferencias: items.map((item) => ({
            fecha: item.fecha,
            monto: Number(item.monto),
            moneda: "MXN",
            bancoOrigen: item.bancoOrigen || null,
            bancoDestino: cuenta?.banco ?? null,
            referencia: item.referencia || null,
            estado: estadoLote,
            comprobante: item.comprobante,
          })),
        }),
      });
    } catch {
      setGuardando(false);
      toast("No hubo conexión. El lote sigue aquí para que puedas reintentar", "error");
      return;
    }

    const datos = await respuesta.json().catch(() => ({}));
    setGuardando(false);

    if (respuesta.status === 409 && datos.duplicado && !permitirDuplicados) {
      setDuplicados(new Set(datos.indices ?? []));
      if (
        confirm(
          `${datos.error ?? "Hay posibles duplicados."}\n\n¿Guardar el lote de todas formas?`,
        )
      ) {
        await guardar(true);
      }
      return;
    }

    if (!respuesta.ok) {
      toast(datos.error ?? "No se pudo guardar el lote", "error");
      return;
    }

    onSaved(datos.cantidad ?? items.length);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#08070d]/80 p-2 backdrop-blur-sm sm:p-4">
      <div className="mx-auto flex h-full max-w-[1500px] items-center justify-center">
        <section className="flex max-h-full w-full flex-col overflow-hidden rounded-[24px] border border-slate-200/80 bg-[#f8f6f1] shadow-2xl dark:border-slate-700 dark:bg-[#151d2b]">
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700 sm:px-6">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-300">
                Revisión antes de guardar
              </p>
              <h2 className="text-xl font-bold sm:text-2xl">Carga de transferencias por lote</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Un cliente, varios comprobantes. Confirma cada monto antes de registrar.
              </p>
            </div>
            <button
              type="button"
              onClick={cerrar}
              disabled={procesando || guardando}
              className="rounded-full border border-slate-300 p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-40 dark:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Cerrar carga por lote"
            >
              <IconX className="h-5 w-5" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-5 lg:grid-cols-[280px_1fr]">
            <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/40">
                <label className="label">Cliente *</label>
                <ClienteCombobox
                  clientes={opcionesCliente}
                  value={clienteId}
                  onChange={elegirCliente}
                />

                <label className="label mt-4">
                  Cuenta destino{cuentas.length > 1 ? " *" : ""}
                </label>
                <select
                  className="input"
                  value={cuentaId}
                  onChange={(evento) => setCuentaId(evento.target.value)}
                  disabled={!clienteId || cuentas.length === 0}
                >
                  {!clienteId ? (
                    <option value="">Elige un cliente primero</option>
                  ) : cuentas.length === 0 ? (
                    <option value="">Sin cuentas guardadas</option>
                  ) : (
                    <>
                      <option value="">
                        {cuentas.length > 1 ? "Elige una cuenta" : "Sin especificar"}
                      </option>
                      {cuentas.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.banco} · {item.enmascarado}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {cuentas.length > 1 && !cuentaId ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                    Este cliente tiene varias cuentas. Elige el destino del lote.
                  </p>
                ) : null}

                <label className="label mt-4">Estado del lote</label>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setEstadoLote("pendiente")}
                    aria-pressed={estadoLote === "pendiente"}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                      estadoLote === "pendiente"
                        ? "bg-white text-amber-700 shadow-sm dark:bg-slate-700 dark:text-amber-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <IconClock className="h-3.5 w-3.5" /> Pendientes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadoLote("reflejada")}
                    aria-pressed={estadoLote === "reflejada"}
                    className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition ${
                      estadoLote === "reflejada"
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                    }`}
                  >
                    <IconCheckCircle className="h-3.5 w-3.5" /> Reflejadas
                  </button>
                </div>
              </div>

              <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/70 px-4 py-5 text-center transition hover:border-amber-500 hover:bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/5 dark:hover:border-amber-300">
                <IconImage className="mb-1.5 h-6 w-6 text-amber-600 dark:text-amber-300" />
                <span className="font-semibold">Agregar comprobantes</span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Selecciona varias capturas a la vez
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={agregarArchivos}
                  disabled={procesando || items.length >= MAX_ARCHIVOS}
                  className="sr-only"
                />
              </label>

              {items.length > 0 ? (
                <div className="rounded-2xl bg-slate-900 p-3.5 text-white dark:bg-[#0b101a]">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-400">
                        Total revisado
                      </p>
                      <p className="mt-0.5 text-xl font-bold">{formatMonto(total, "MXN")}</p>
                      <p
                        className={`mt-1 text-[11px] font-semibold ${
                          estadoLote === "reflejada"
                            ? "text-emerald-300"
                            : "text-amber-300"
                        }`}
                      >
                        {estadoLote === "reflejada"
                          ? "Se guardarán como reflejadas"
                          : "Se guardarán como pendientes"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-amber-300">
                      {verificados}/{items.length}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all"
                      style={{
                        width: `${items.length ? (verificados / items.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </aside>

            <main className="min-w-0">
              {items.length === 0 ? (
                <div className="flex min-h-80 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white/70 px-6 text-center dark:border-slate-700 dark:bg-slate-900/30">
                  <IconFolder className="mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <h3 className="font-semibold">Todavía no hay comprobantes</h3>
                  <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                    Al agregarlos, leeremos automáticamente monto, referencia y banco para que sólo tengas que revisarlos.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 xl:grid-cols-2">
                  {items.map((item, index) => {
                    const montoValido = Number(item.monto) > 0;
                    const esDuplicado = duplicados.has(index);
                    return (
                      <article
                        key={item.id}
                        className={`grid content-start gap-3 rounded-2xl border bg-white p-3 transition dark:bg-slate-900/40 sm:grid-cols-[88px_1fr] ${
                          esDuplicado
                            ? "border-orange-400 ring-2 ring-orange-300/30"
                            : item.verificado
                              ? "border-emerald-300 dark:border-emerald-500/40"
                              : "border-slate-200 dark:border-slate-700"
                        }`}
                      >
                        <div>
                          {item.comprobante ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.comprobante}
                              alt={`Comprobante ${index + 1}`}
                              onClick={() => setAmpliada(item.comprobante)}
                              className="h-24 w-full cursor-zoom-in rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 sm:h-28"
                            />
                          ) : (
                            <div className="flex h-24 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400 dark:bg-slate-800 sm:h-28">
                              Preparando…
                            </div>
                          )}
                          <p className="mt-1.5 truncate text-[10px] text-slate-400" title={item.nombreArchivo}>
                            {index + 1}. {item.nombreArchivo}
                          </p>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                                Comprobante {String(index + 1).padStart(2, "0")}
                              </p>
                              {item.estadoLectura === "leyendo" ? (
                                <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                                  Leyendo comprobante… {item.progreso}%
                                </p>
                              ) : item.estadoLectura === "error" ? (
                                <p className="mt-1 text-xs text-red-500">
                                  No se pudo leer. Captura los datos manualmente.
                                </p>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => quitar(item.id)}
                              disabled={procesando || guardando}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40 dark:hover:bg-red-500/10"
                              aria-label={`Quitar comprobante ${index + 1}`}
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
                            <div>
                              <label className="label">Monto *</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-slate-400">
                                  $
                                </span>
                                <input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  value={item.monto}
                                  onChange={(evento) =>
                                    actualizar(item.id, {
                                      monto: evento.target.value,
                                      verificado: false,
                                    })
                                  }
                                  className={`input pl-7 text-base font-bold ${
                                    montoValido ? "" : "border-red-400"
                                  }`}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="label">Fecha *</label>
                              <input
                                type="date"
                                value={item.fecha}
                                onChange={(evento) =>
                                  actualizar(item.id, { fecha: evento.target.value })
                                }
                                className="input"
                              />
                            </div>
                            <div>
                              <label className="label">Banco origen</label>
                              <input
                                value={item.bancoOrigen}
                                onChange={(evento) =>
                                  actualizar(item.id, { bancoOrigen: evento.target.value })
                                }
                                className="input"
                                placeholder="Banco detectado"
                              />
                            </div>
                            <div>
                              <label className="label">Referencia</label>
                              <input
                                value={item.referencia}
                                onChange={(evento) =>
                                  actualizar(item.id, { referencia: evento.target.value })
                                }
                                className="input"
                                placeholder="Referencia detectada"
                              />
                            </div>
                          </div>

                          <label
                            className={`mt-2 flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                              item.verificado
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                                : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.verificado}
                              disabled={!montoValido || item.estadoLectura === "leyendo"}
                              onChange={(evento) =>
                                actualizar(item.id, { verificado: evento.target.checked })
                              }
                              className="h-4 w-4 accent-emerald-600"
                            />
                            <IconCheck className="h-4 w-4" />
                            {item.verificado
                              ? "Monto verificado"
                              : "Confirmo que este monto es correcto"}
                          </label>
                          {esDuplicado ? (
                            <p className="mt-2 text-xs font-medium text-orange-600 dark:text-orange-300">
                              Posible duplicado: coincide en cliente, monto y día.
                            </p>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </main>
          </div>

          <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-5 py-3.5 shadow-[0_-10px_30px_rgba(8,7,13,0.08)] dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {procesando
                ? "Procesando comprobantes. Espera a que termine la lectura."
                : items.length === 0
                  ? "Agrega comprobantes para comenzar."
                  : `${verificados} de ${items.length} montos verificados.`}
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={cerrar} className="btn-secondary">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => guardar(false)}
                disabled={!puedeGuardar}
                className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconCheck className="h-4 w-4" />
                {guardando
                  ? "Guardando lote…"
                  : `Confirmar y guardar ${items.length || ""}`}
              </button>
            </div>
          </footer>
        </section>
      </div>

      {ampliada ? (
        <button
          type="button"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setAmpliada(null)}
          aria-label="Cerrar vista ampliada"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ampliada}
            alt="Comprobante ampliado"
            className="max-h-[92vh] max-w-full rounded-xl object-contain"
          />
        </button>
      ) : null}
    </div>
  );
}
