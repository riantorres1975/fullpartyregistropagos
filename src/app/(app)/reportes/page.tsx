"use client";

import { useState } from "react";
import useSWR from "swr";
import ClienteCombobox from "@/components/ClienteCombobox";
import { formatMonto } from "@/lib/format";
import { Skeleton } from "@/components/Skeleton";
import {
  IconFilter,
  IconChart,
  IconSave,
  IconDownload,
  IconEye,
  IconClock,
  IconCheckCircle,
} from "@/components/icons";

type ClienteOpt = { id: string; nombre: string };

type Reporte = {
  total: number;
  resumen: Record<string, { pendiente: number; reflejada: number; total: number }>;
  items: { clienteId: string }[];
};

export default function ReportesPage() {
  const { data: clientesData } = useSWR<ClienteOpt[]>("/api/clientes");
  const clientes: ClienteOpt[] = (clientesData ?? []).map((c) => ({
    id: c.id,
    nombre: c.nombre,
  }));
  const [f, setF] = useState({ clienteId: "", estado: "", desde: "", hasta: "" });

  function queryString() {
    const sp = new URLSearchParams();
    if (f.clienteId) sp.set("clienteId", f.clienteId);
    if (f.estado) sp.set("estado", f.estado);
    if (f.desde) sp.set("desde", f.desde);
    if (f.hasta) sp.set("hasta", f.hasta);
    const s = sp.toString();
    return s ? "?" + s : "";
  }

  const hayFiltros = !!(f.clienteId || f.estado || f.desde || f.hasta);

  // Resumen en vivo de los datos según los filtros actuales.
  const { data: reporte, isLoading } = useSWR<Reporte>(
    "/api/reportes" + queryString(),
  );
  const nClientes = reporte
    ? new Set(reporte.items.map((i) => i.clienteId).filter(Boolean)).size
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reportes y respaldo</h1>

      {/* Filtros */}
      <div className="card space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <IconFilter className="h-4 w-4" /> Filtrar reporte (opcional)
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label">Cliente</label>
            <ClienteCombobox
              clientes={clientes}
              value={f.clienteId}
              onChange={(id) => setF({ ...f, clienteId: id })}
              placeholder="Todos los clientes…"
            />
          </div>
          <div>
            <label className="label">Estado</label>
            <select
              className="input"
              value={f.estado}
              onChange={(e) => setF({ ...f, estado: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="reflejada">Reflejada</option>
            </select>
          </div>
          <div>
            <label className="label">Desde</label>
            <input
              type="date"
              className="input"
              value={f.desde}
              onChange={(e) => setF({ ...f, desde: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Hasta</label>
            <input
              type="date"
              className="input"
              value={f.hasta}
              onChange={(e) => setF({ ...f, hasta: e.target.value })}
            />
          </div>
        </div>
        {hayFiltros && (
          <button
            onClick={() => setF({ clienteId: "", estado: "", desde: "", hasta: "" })}
            className="btn-secondary px-3 py-1.5 text-sm"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Resumen en vivo (ver los datos sin abrir otra página) */}
      <div className="card space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <IconChart className="h-4 w-4" /> Resumen
          {hayFiltros && (
            <span className="text-xs font-normal text-slate-400">(filtrado)</span>
          )}
        </h2>

        {isLoading && !reporte ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : !reporte || reporte.total === 0 ? (
          <p className="text-sm text-slate-400">
            No hay transferencias con estos filtros.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              {reporte.total} registro(s) · {nClientes} cliente(s)
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(reporte.resumen).map(([moneda, r]) => (
                <div
                  key={moneda}
                  className="rounded-xl bg-slate-50 p-4 dark:bg-slate-700/50"
                >
                  <p className="text-xs font-semibold text-slate-400">{moneda}</p>
                  <p className="font-display text-2xl font-extrabold">
                    {formatMonto(r.total, moneda)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                    <span className="flex items-center gap-1 text-amber-600">
                      <IconClock className="h-3.5 w-3.5" />
                      {formatMonto(r.pendiente, moneda)} pendiente
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <IconCheckCircle className="h-3.5 w-3.5" />
                      {formatMonto(r.reflejada, moneda)} reflejada
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Acciones */}
      <div className="card space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <IconEye className="h-4 w-4" /> Ver reporte por cliente
          </h2>
          <p className="mb-2 text-sm text-slate-500">
            Abre el reporte detallado agrupado por cliente con subtotales. Ahí
            mismo puedes imprimirlo o guardarlo como PDF si lo necesitas.
          </p>
          <a
            href={"/imprimir" + queryString()}
            target="_blank"
            rel="noopener"
            className="btn-primary inline-flex"
          >
            <IconEye className="h-4 w-4" /> Ver reporte
          </a>
        </div>

        <hr className="border-slate-100 dark:border-slate-700" />

        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <IconDownload className="h-4 w-4" /> Exportar a Excel
          </h2>
          <p className="mb-2 text-sm text-slate-500">
            Descarga las transferencias (según los filtros) en un archivo CSV que
            abre en Excel.
          </p>
          <a
            href={"/api/export/transferencias" + queryString()}
            className="btn-secondary inline-flex"
          >
            <IconDownload className="h-4 w-4" /> Descargar Excel/CSV
          </a>
        </div>

        <hr className="border-slate-100 dark:border-slate-700" />

        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <IconSave className="h-4 w-4" /> Copia de seguridad
          </h2>
          <p className="mb-2 text-sm text-slate-500">
            Respaldo COMPLETO en formato JSON (todos los datos, sin filtros). Las
            cuentas van cifradas y solo se restauran con la misma clave de
            cifrado. Guárdalo en lugar seguro.
          </p>
          <a href="/api/backup" className="btn-secondary inline-flex">
            <IconSave className="h-4 w-4" /> Descargar respaldo (.json)
          </a>
        </div>
      </div>
    </div>
  );
}
