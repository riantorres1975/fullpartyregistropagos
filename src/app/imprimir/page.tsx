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
    <div className="print-root min-h-screen bg-slate-100 print:min-h-0 print:bg-white">
      {/* Ajustes de página: márgenes mínimos para aprovechar todo el ancho */}
      <style>{`
        .vista-mobile { display: none; }
        .tabla-reporte { display: table; }
        @media screen and (max-width: 639px) {
          .vista-mobile { display: block; }
          .tabla-reporte { display: none; }
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body {
            min-height: 0 !important;
            background: #fff !important;
            color: #0f172a !important;
          }
          body { display: block !important; }
          nextjs-portal, body > iframe { display: none !important; }
          .print-root, .print-sheet { background: #fff !important; }
          .vista-mobile { display: none !important; }
          .tabla-reporte { display: table !important; }
          .cliente-reporte {
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .cliente-reporte > h2 {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          thead { display: table-header-group; }
          tfoot { display: table-row-group; }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Barra de acciones fija (no se imprime) */}
      <div className="sticky top-0 z-10 flex gap-2 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur sm:px-4 print:hidden">
        <button
          onClick={() => window.print()}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 sm:flex-none sm:px-4"
        >
          <IconPrinter className="h-4 w-4" /> Imprimir / Guardar PDF
        </button>
        <button
          onClick={() => window.close()}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 sm:px-4"
        >
          Cerrar
        </button>
      </div>

      {/* La "hoja": en pantalla se ve como un documento; al imprimir ocupa todo el ancho */}
      <div
        className="print-sheet mx-auto max-w-4xl bg-white p-4 text-slate-900 sm:my-4 sm:p-10 sm:shadow-lg print:my-0 print:max-w-none print:p-0 print:shadow-none"
        style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}
      >
      <div className="mb-4 flex items-center gap-3 border-b-2 border-violet-600 pb-3 sm:mb-5">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white sm:h-12 sm:w-12"
          style={{ background: "linear-gradient(135deg,#6d28d9 0%,#db2777 100%)" }}
        >
          <IconCard className="h-6 w-6 sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-tight sm:text-xl">
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
          <div key={g.clienteId} className="cliente-reporte mb-6">
            <h2 className="mb-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-2 text-sm font-bold sm:mb-1 sm:rounded-none sm:px-2 sm:py-1 sm:text-base print:mb-1 print:rounded-none print:px-2 print:py-1 print:text-base">
              <IconUser className="h-4 w-4" /> {g.nombre}{" "}
              <span className="text-xs font-normal text-slate-500">
                ({g.items.length} transferencia{g.items.length !== 1 ? "s" : ""})
              </span>
            </h2>
            <div className="vista-mobile space-y-2">
              {g.items.map((t, i) => (
                <article
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {formatFecha(t.fecha)}
                      </p>
                      <p className="mt-0.5 text-lg font-extrabold text-slate-900">
                        {formatMonto(t.monto, t.moneda)}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                        t.estado === "reflejada"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {t.estado === "reflejada" ? "Reflejada" : "Pendiente"}
                    </span>
                  </div>
                  <div className="mt-2 flex items-stretch gap-2 rounded-xl bg-slate-50 p-2 text-xs">
                    <div className="flex min-w-0 flex-1 flex-col justify-center rounded-lg bg-white px-2.5 py-2 ring-1 ring-slate-200">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Origen
                      </span>
                      <span className="mt-0.5 break-words font-semibold text-slate-800">
                        {t.bancoOrigen || "Sin banco"}
                      </span>
                    </div>
                    <span
                      className="flex h-8 w-8 shrink-0 self-center items-center justify-center rounded-full bg-violet-100 text-base font-bold text-violet-600"
                      aria-hidden="true"
                    >
                      →
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col justify-center rounded-lg bg-white px-2.5 py-2 text-right ring-1 ring-slate-200">
                      <span className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Destino
                      </span>
                      <span className="mt-0.5 break-words font-semibold text-slate-800">
                        {t.bancoDestino || "Sin banco"}
                      </span>
                    </div>
                  </div>
                  <p className="mt-2 break-all text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Referencia:</span>{" "}
                    {t.referencia || "—"}
                  </p>
                </article>
              ))}
              {Object.entries(sub).map(([moneda, s]) => (
                <div
                  key={moneda}
                  className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-slate-600"
                >
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-slate-900">Subtotal {moneda}</strong>
                    <strong className="text-sm text-violet-800">
                      {formatMonto(s.total, moneda)}
                    </strong>
                  </div>
                  <p className="mt-1">
                    Pendiente: {formatMonto(s.pendiente, moneda)} · Reflejada:{" "}
                    {formatMonto(s.reflejada, moneda)}
                  </p>
                </div>
              ))}
            </div>

            <table className="tabla-reporte w-full border-collapse text-xs">
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
                  <tr key={i} className="even:bg-slate-50">
                    <td className="border border-slate-400 px-2 py-1 whitespace-nowrap">{formatFecha(t.fecha)}</td>
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
    </div>
  );
}
