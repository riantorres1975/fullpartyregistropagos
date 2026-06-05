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
  porMes: { label: string; pendiente: number; reflejada: number }[];
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
        <Stat
          label="Pendientes"
          value={data.pendientes}
          color="text-amber-500"
          emoji="⏳"
          chip="bg-amber-100 dark:bg-amber-500/15"
        />
        <Stat
          label="Reflejadas"
          value={data.reflejadas}
          color="text-emerald-500"
          emoji="✅"
          chip="bg-emerald-100 dark:bg-emerald-500/15"
        />
        <Stat
          label="Total registros"
          value={data.totalTransferencias}
          color="text-violet-500"
          emoji="📋"
          chip="bg-violet-100 dark:bg-violet-500/15"
        />
        <Stat
          label="Clientes"
          value={data.totalClientes}
          color="text-pink-500"
          emoji="👥"
          chip="bg-pink-100 dark:bg-pink-500/15"
        />
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
                className="flex flex-wrap items-center justify-between rounded-lg bg-slate-50 px-4 py-2 text-sm dark:bg-slate-700/50"
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
        <h2 className="mb-4 font-semibold">Transferencias por mes</h2>
        <GraficaMeses datos={data.porMes} />
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Últimas transferencias</h2>
        {data.ultimas.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no registras transferencias.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
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
  chip,
}: {
  label: string;
  value: number;
  color: string;
  emoji: string;
  chip: string;
}) {
  return (
    <div className="card flex items-center gap-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ${chip}`}
      >
        {emoji}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className={`font-display text-3xl font-extrabold ${color}`}>{value}</p>
      </div>
    </div>
  );
}

function GraficaMeses({
  datos,
}: {
  datos: { label: string; pendiente: number; reflejada: number }[];
}) {
  const max = Math.max(1, ...datos.map((d) => d.pendiente + d.reflejada));
  const sinDatos = datos.every((d) => d.pendiente + d.reflejada === 0);

  if (sinDatos) {
    return (
      <p className="text-sm text-slate-400">
        Aún no hay transferencias en los últimos 6 meses.
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-2" style={{ height: 160 }}>
        {datos.map((d) => {
          const total = d.pendiente + d.reflejada;
          const hPend = (d.pendiente / max) * 140;
          const hRef = (d.reflejada / max) * 140;
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center justify-end">
              <span className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {total > 0 ? total : ""}
              </span>
              <div
                className="flex w-full max-w-[42px] flex-col-reverse overflow-hidden rounded-md"
                title={`${d.label}: ${d.pendiente} pendiente, ${d.reflejada} reflejada`}
              >
                <div className="bg-amber-400" style={{ height: hPend }} />
                <div className="bg-green-500" style={{ height: hRef }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between gap-2">
        {datos.map((d) => (
          <span
            key={d.label}
            className="flex-1 text-center text-xs capitalize text-slate-500 dark:text-slate-400"
          >
            {d.label}
          </span>
        ))}
      </div>
      <div className="mt-4 flex justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-400" /> Pendiente
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-sm bg-green-500" /> Reflejada
        </span>
      </div>
    </div>
  );
}
