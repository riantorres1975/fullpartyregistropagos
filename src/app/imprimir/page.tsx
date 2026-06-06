"use client";

import { useEffect, useState } from "react";
import { formatMonto, formatFecha } from "@/lib/format";
import { IconPrinter, IconCard, IconUser } from "@/components/icons";

type Item = {
  fecha: string;
  clienteId: string;
  cliente: string;
  monto: number;
  moneda: string;
  bancoOrigen: string | null;
  bancoDestino: string | null;
  referencia: string | null;
  estado: string;
};

type Reporte = {
  generadoEn: string;
  total: number;
  resumen: Record<string, { pendiente: number; reflejada: number; total: number }>;
  items: Item[];
};

type Subtotales = Record<string, { pendiente: number; reflejada: number; total: number }>;

function calcularSubtotales(items: Item[]): Subtotales {
  const m: Subtotales = {};
  for (const t of items) {
    const e = (m[t.moneda] ??= { pendiente: 0, reflejada: 0, total: 0 });
    if (t.estado === "reflejada") e.reflejada += t.monto;
    else e.pendiente += t.monto;
    e.total += t.monto;
  }
  return m;
}

export default function ImprimirPage() {
  const [data, setData] = useState<Reporte | null>(null);

  useEffect(() => {
    fetch("/api/reportes" + window.location.search)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return <p style={{ padding: 24 }}>Generando reporte…</p>;
  }

  // Resumen de filtros aplicados (para mostrar en el encabezado)
  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : "",
  );
  const filtros: string[] = [];
  if (params.get("desde") || params.get("hasta")) {
    filtros.push(
      `Periodo: ${params.get("desde") || "inicio"} al ${params.get("hasta") || "hoy"}`,
    );
  }
  if (params.get("estado")) filtros.push(`Estado: ${params.get("estado")}`);

  // Agrupar por cliente, conservando el orden recibido (ya viene por nombre).
  const grupos: { clienteId: string; nombre: string; items: Item[] }[] = [];
  const indice = new Map<string, number>();
  for (const t of data.items) {
    const key = t.clienteId || "__sin__";
    if (!indice.has(key)) {
      indice.set(key, grupos.length);
      grupos.push({ clienteId: key, nombre: t.cliente, items: [] });
    }
    grupos[indice.get(key)!].items.push(t);
  }

  return (
    <div
      className="mx-auto max-w-4xl bg-white p-4 text-slate-900 sm:p-8"
      style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
    >
      {/* Barra de acciones (no se imprime) */}
      <div className="mb-6 flex gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white"
        >
          <IconPrinter className="h-4 w-4" /> Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Cerrar
        </button>
      </div>

      <div className="mb-5 flex items-center gap-3 border-b-2 border-violet-600 pb-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ background: "linear-gradient(135deg,#6d28d9 0%,#db2777 100%)" }}
        >
          <IconCard className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold leading-tight">
            Mis Transferencias
          </h1>
          <p className="text-sm font-medium text-violet-700">
            Reporte por cliente · Full Party
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Generado: {formatFecha(data.generadoEn)} · {data.total} registro(s) ·{" "}
            {grupos.length} cliente(s)
            {filtros.length > 0 ? ` · ${filtros.join(" · ")}` : ""}
          </p>
        </div>
      </div>

      {grupos.length === 0 && (
        <p className="text-sm text-slate-500">No hay transferencias.</p>
      )}

      {/* Un bloque por cliente */}
      {grupos.map((g) => {
        const sub = calcularSubtotales(g.items);
        return (
          <div key={g.clienteId} className="mb-6 break-inside-avoid">
            <h2 className="mb-1 flex items-center gap-1.5 bg-slate-100 px-2 py-1 text-base font-bold">
              <IconUser className="h-4 w-4" /> {g.nombre}{" "}
              <span className="text-xs font-normal text-slate-500">
                ({g.items.length} transferencia{g.items.length !== 1 ? "s" : ""})
              </span>
            </h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {["Fecha", "Monto", "Banco origen", "Banco destino", "Referencia", "Estado"].map(
                    (h) => (
                      <th
                        key={h}
                        className="border border-slate-400 bg-slate-50 px-2 py-1 text-left"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {g.items.map((t, i) => (
                  <tr key={i}>
                    <td className="border border-slate-400 px-2 py-1">{formatFecha(t.fecha)}</td>
                    <td className="border border-slate-400 px-2 py-1 text-right font-semibold">
                      {formatMonto(t.monto, t.moneda)}
                    </td>
                    <td className="border border-slate-400 px-2 py-1">{t.bancoOrigen || "—"}</td>
                    <td className="border border-slate-400 px-2 py-1">{t.bancoDestino || "—"}</td>
                    <td className="border border-slate-400 px-2 py-1">{t.referencia || "—"}</td>
                    <td className="border border-slate-400 px-2 py-1">
                      {t.estado === "reflejada" ? "Reflejada" : "Pendiente"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {Object.entries(sub).map(([moneda, s]) => (
                  <tr key={moneda} className="font-semibold">
                    <td className="border border-slate-400 bg-slate-50 px-2 py-1">
                      Subtotal {moneda}
                    </td>
                    <td className="border border-slate-400 bg-slate-50 px-2 py-1 text-right">
                      {formatMonto(s.total, moneda)}
                    </td>
                    <td
                      colSpan={4}
                      className="border border-slate-400 bg-slate-50 px-2 py-1 text-xs font-normal text-slate-600"
                    >
                      Pendiente: {formatMonto(s.pendiente, moneda)} · Reflejada:{" "}
                      {formatMonto(s.reflejada, moneda)}
                    </td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        );
      })}

      {/* Total general */}
      {Object.keys(data.resumen).length > 0 && (
        <div className="mt-6 break-inside-avoid border-t-2 border-slate-800 pt-3">
          <h2 className="mb-2 text-base font-bold">Total general</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {Object.entries(data.resumen).map(([moneda, r]) => (
              <div key={moneda} className="rounded border border-slate-300 px-3 py-2">
                <strong>{moneda}</strong> — Pendiente: {formatMonto(r.pendiente, moneda)} ·
                Reflejada: {formatMonto(r.reflejada, moneda)} ·{" "}
                <strong>Total: {formatMonto(r.total, moneda)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
