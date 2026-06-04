"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatMonto, formatFecha } from "@/lib/format";

type Dashboard = {
  pendientes: number;
  reflejadas: number;
  totalTransferencias: number;
  totalClientes: number;
  totalesPorMoneda: Record<string, { pendiente: number; reflejada: number }>;
  ultimas: {
    id: string;
    fecha: string;
    monto: number;
    moneda: string;
    estado: string;
    cliente: string | null;
  }[];
};

export default function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) {
    return <p className="text-slate-500">Cargando…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resumen</h1>
        <Link href="/transferencias" className="btn-primary">
          + Nueva transferencia
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Pendientes" value={data.pendientes} color="text-amber-600" emoji="⏳" />
        <Stat label="Reflejadas" value={data.reflejadas} color="text-green-600" emoji="✅" />
        <Stat label="Total registros" value={data.totalTransferencias} color="text-indigo-600" emoji="📋" />
        <Stat label="Clientes" value={data.totalClientes} color="text-purple-600" emoji="👥" />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Montos por moneda</h2>
        {Object.keys(data.totalesPorMoneda).length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay montos registrados.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(data.totalesPorMoneda).map(([moneda, t]) => (
              <div
                key={moneda}
                className="flex flex-wrap items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm"
              >
                <span className="font-semibold">{moneda}</span>
                <span className="text-amber-600">
                  ⏳ {formatMonto(t.pendiente, moneda)}
                </span>
                <span className="text-green-600">
                  ✅ {formatMonto(t.reflejada, moneda)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Últimas transferencias</h2>
        {data.ultimas.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no registras transferencias.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.ultimas.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-medium">{t.cliente ?? "Sin cliente"}</p>
                  <p className="text-xs text-slate-400">{formatFecha(t.fecha)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatMonto(t.monto, t.moneda)}</p>
                  <span
                    className={`text-xs ${
                      t.estado === "reflejada" ? "text-green-600" : "text-amber-600"
                    }`}
                  >
                    {t.estado === "reflejada" ? "✅ Reflejada" : "⏳ Pendiente"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  emoji,
}: {
  label: string;
  value: number;
  color: string;
  emoji: string;
}) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">
        {emoji} {label}
      </p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
