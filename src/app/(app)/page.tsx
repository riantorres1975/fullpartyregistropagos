"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import Link from "next/link";
import { formatMonto, formatFecha } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/Skeleton";
import {
  IconPlus,
  IconClock,
  IconCheckCircle,
  IconCard,
  IconUsers,
  IconTransfer,
  IconChart,
  IconTrashBin,
  IconEye,
  IconEyeOff,
} from "@/components/icons";

type IconComp = (p: { className?: string }) => React.ReactElement;

type Dashboard = {
  pendientes: number;
  reflejadas: number;
  totalTransferencias: number;
  totalClientes: number;
  totalesPorMoneda: Record<string, { pendiente: number; reflejada: number }>;
  porMes: { label: string; pendiente: number; reflejada: number; montoMXN: number }[];
  porBanco: { banco: string; total: number; cuenta: number }[];
  porCliente: { cliente: string; total: number; cuenta: number }[];
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
  const { data, mutate } = useSWR<Dashboard>("/api/dashboard");
  const { mutate: globalMutate } = useSWRConfig();
  const [ocultar, setOcultar] = useState(false);

  // Marca/desmarca reflejada desde aquí mismo, sin abrir la transferencia.
  async function toggleEstado(id: string, estadoActual: string) {
    const nuevo = estadoActual === "reflejada" ? "pendiente" : "reflejada";
    await fetch(`/api/transferencias/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevo }),
    });
    mutate();
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/transferencias"),
    );
    toast(nuevo === "reflejada" ? "Marcada como reflejada" : "Marcada como pendiente");
  }

  if (!data) {
    return <DashboardSkeleton />;
  }

  const mxn = data.totalesPorMoneda["MXN"] ?? { pendiente: 0, reflejada: 0 };

  return (
    <div className="space-y-6">
      {/* Tarjeta resumen tipo Spin: se recarga sobre el header morado. */}
      <div className="-mt-8 rounded-3xl bg-white p-5 shadow-xl ring-1 ring-black/5 dark:bg-slate-800 dark:ring-white/10 sm:mt-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Reflejado (MXN)
            </p>
            <p className="font-display text-3xl font-extrabold">
              {ocultar ? "••••••" : formatMonto(mxn.reflejada, "MXN")}
            </p>
            <p className="mt-1 flex items-center gap-1 text-sm text-amber-600">
              <IconClock className="h-4 w-4" /> Por reflejar:{" "}
              {ocultar ? "••••" : formatMonto(mxn.pendiente, "MXN")}
            </p>
          </div>
          <button
            onClick={() => setOcultar((v) => !v)}
            aria-label="Mostrar u ocultar montos"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            {ocultar ? (
              <IconEyeOff className="h-5 w-5" />
            ) : (
              <IconEye className="h-5 w-5" />
            )}
          </button>
        </div>
        <Link
          href="/transferencias"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(115deg,#6d28d9_0%,#db2777_115%)] px-4 py-3 font-semibold text-white shadow-md shadow-violet-600/25 transition-transform active:scale-[0.99]"
        >
          <IconPlus className="h-5 w-5" /> Nueva transferencia
        </Link>
      </div>

      {/* Accesos rápidos (tiles circulares). */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-4 gap-2">
          <AccionRapida href="/transferencias" label="Transferir" Icon={IconTransfer} />
          <AccionRapida href="/clientes" label="Clientes" Icon={IconUsers} />
          <AccionRapida href="/reportes" label="Reportes" Icon={IconChart} />
          <AccionRapida href="/papelera" label="Papelera" Icon={IconTrashBin} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Pendientes"
          value={data.pendientes}
          color="text-amber-500"
          Icon={IconClock}
          chip="bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
        <Stat
          label="Reflejadas"
          value={data.reflejadas}
          color="text-emerald-500"
          Icon={IconCheckCircle}
          chip="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        />
        <Stat
          label="Total registros"
          value={data.totalTransferencias}
          color="text-violet-500"
          Icon={IconCard}
          chip="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
        />
        <Stat
          label="Clientes"
          value={data.totalClientes}
          color="text-pink-500"
          Icon={IconUsers}
          chip="bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-400"
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
                <span className="flex items-center gap-1 text-amber-600">
                  <IconClock className="h-4 w-4" /> {formatMonto(t.pendiente, moneda)}
                </span>
                <span className="flex items-center gap-1 text-emerald-600">
                  <IconCheckCircle className="h-4 w-4" /> {formatMonto(t.reflejada, moneda)}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {data.porBanco.length > 0 && (
          <div className="card">
            <h2 className="mb-3 font-semibold">Por banco destino (MXN)</h2>
            <BancoBarras
              datos={data.porBanco.map((b) => ({ etiqueta: b.banco, total: b.total }))}
              color="bg-violet-500"
            />
          </div>
        )}
        {data.porCliente.length > 0 && (
          <div className="card">
            <h2 className="mb-3 font-semibold">Por cliente (MXN)</h2>
            <BancoBarras
              datos={data.porCliente.map((c) => ({ etiqueta: c.cliente, total: c.total }))}
              color="bg-pink-500"
            />
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="mb-3 font-semibold">Últimas transferencias</h2>
        {data.ultimas.length === 0 ? (
          <p className="text-sm text-slate-400">Todavía no registras transferencias.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {data.ultimas.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.cliente ?? "Sin cliente"}</p>
                  <p className="text-xs text-slate-400">{formatFecha(t.fecha)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{formatMonto(t.monto, t.moneda)}</p>
                  <button
                    onClick={() => toggleEstado(t.id, t.estado)}
                    title="Clic para cambiar el estado"
                    className={`ml-auto flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.estado === "reflejada"
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                    }`}
                  >
                    {t.estado === "reflejada" ? (
                      <IconCheckCircle className="h-3.5 w-3.5" />
                    ) : (
                      <IconClock className="h-3.5 w-3.5" />
                    )}
                    {t.estado === "reflejada" ? "Reflejada" : "Pendiente"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Tile de acceso rápido (círculo con icono + etiqueta), estilo Spin.
function AccionRapida({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon: IconComp;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 text-center transition-transform active:scale-95"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700 shadow-sm dark:bg-violet-500/15 dark:text-violet-300">
        <Icon className="h-6 w-6" />
      </span>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
      </span>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card flex items-center gap-4">
            <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-7 w-12" />
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-3 h-10 w-full" />
      </div>
      <div className="card">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-4 h-40 w-full" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  color,
  Icon,
  chip,
}: {
  label: string;
  value: number;
  color: string;
  Icon: IconComp;
  chip: string;
}) {
  return (
    <div className="card flex items-center gap-4 transition-transform duration-200 hover:-translate-y-0.5">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${chip}`}
      >
        <Icon className="h-6 w-6" />
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

// Barras horizontales con un total por etiqueta (banco o cliente), en MXN.
function BancoBarras({
  datos,
  color = "bg-violet-500",
}: {
  datos: { etiqueta: string; total: number }[];
  color?: string;
}) {
  const max = Math.max(1, ...datos.map((d) => d.total));
  return (
    <div className="space-y-2.5">
      {datos.map((d) => (
        <div key={d.etiqueta}>
          <div className="mb-0.5 flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate font-medium">{d.etiqueta}</span>
            <span className="shrink-0 font-semibold">
              {formatMonto(d.total, "MXN")}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full ${color}`}
              style={{ width: `${Math.max(4, (d.total / max) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GraficaMeses({
  datos,
}: {
  datos: { label: string; pendiente: number; reflejada: number; montoMXN: number }[];
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
          <div key={d.label} className="flex-1 text-center">
            <span className="block text-xs capitalize text-slate-500 dark:text-slate-400">
              {d.label}
            </span>
            {d.montoMXN > 0 && (
              <span className="block text-[10px] font-medium text-violet-500">
                {formatMonto(d.montoMXN, "MXN")}
              </span>
            )}
          </div>
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
