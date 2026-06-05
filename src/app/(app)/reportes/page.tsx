"use client";

import { useState } from "react";
import useSWR from "swr";
import ClienteCombobox from "@/components/ClienteCombobox";
import {
  IconFilter,
  IconPrinter,
  IconChart,
  IconSave,
  IconDownload,
} from "@/components/icons";

type ClienteOpt = { id: string; nombre: string };

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

  const hayFiltros = f.clienteId || f.estado || f.desde || f.hasta;

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
        <p className="text-xs text-slate-400">
          Los filtros aplican al reporte de impresión y a la exportación a Excel.
        </p>
      </div>

      <div className="card space-y-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <IconPrinter className="h-4 w-4" /> Imprimir reporte por cliente
          </h2>
          <p className="mb-2 text-sm text-slate-500">
            Genera un reporte agrupado por cliente con subtotales, listo para
            imprimir o guardar como PDF.
          </p>
          <a
            href={"/imprimir" + queryString()}
            target="_blank"
            rel="noopener"
            className="btn-primary inline-flex"
          >
            <IconPrinter className="h-4 w-4" /> Imprimir / Guardar PDF
          </a>
        </div>

        <hr className="border-slate-100 dark:border-slate-700" />

        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <IconChart className="h-4 w-4" /> Exportar a Excel
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
