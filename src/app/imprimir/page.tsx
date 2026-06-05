"use client";

import { useEffect, useState } from "react";
import { formatMonto, formatFecha } from "@/lib/format";

type Item = {
  fecha: string;
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

export default function ImprimirPage() {
  const [data, setData] = useState<Reporte | null>(null);

  useEffect(() => {
    fetch("/api/reportes" + window.location.search)
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (data && data.items.length >= 0) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [data]);

  if (!data) {
    return <p style={{ padding: 24 }}>Generando reporte…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl bg-white p-8 text-slate-900">
      {/* Barra de acciones (no se imprime) */}
      <div className="mb-6 flex gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          🖨️ Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
        >
          Cerrar
        </button>
      </div>

      <div className="mb-4 border-b-2 border-slate-800 pb-3">
        <h1 className="text-2xl font-bold">💳 Reporte de Transferencias</h1>
        <p className="text-sm text-slate-500">Full Party</p>
        <p className="text-xs text-slate-500">
          Generado: {formatFecha(data.generadoEn)} · {data.total} registro(s)
        </p>
      </div>

      {/* Totales */}
      {Object.keys(data.resumen).length > 0 && (
        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          {Object.entries(data.resumen).map(([moneda, r]) => (
            <div key={moneda} className="rounded border border-slate-300 px-3 py-2">
              <strong>{moneda}</strong> — Pendiente: {formatMonto(r.pendiente, moneda)} ·
              Reflejada: {formatMonto(r.reflejada, moneda)} ·{" "}
              <strong>Total: {formatMonto(r.total, moneda)}</strong>
            </div>
          ))}
        </div>
      )}

      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            {["Fecha", "Cliente", "Monto", "Banco origen", "Banco destino", "Referencia", "Estado"].map(
              (h) => (
                <th
                  key={h}
                  className="border border-slate-400 bg-slate-100 px-2 py-1 text-left"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 ? (
            <tr>
              <td colSpan={7} className="border border-slate-400 px-2 py-4 text-center">
                No hay transferencias.
              </td>
            </tr>
          ) : (
            data.items.map((t, i) => (
              <tr key={i}>
                <td className="border border-slate-400 px-2 py-1">{formatFecha(t.fecha)}</td>
                <td className="border border-slate-400 px-2 py-1">{t.cliente || "—"}</td>
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
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
