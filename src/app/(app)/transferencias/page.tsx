"use client";

import { useCallback, useEffect, useState } from "react";
import { BANCOS, MONEDAS } from "@/lib/bancos";
import { formatMonto, formatFecha } from "@/lib/format";

type ClienteOpt = { id: string; nombre: string };

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
  clienteId: string | null;
  cliente: { id: string; nombre: string } | null;
};

const hoy = () => new Date().toISOString().slice(0, 10);

const formVacio = {
  fecha: hoy(),
  clienteId: "",
  monto: "",
  moneda: "MXN",
  bancoOrigen: "",
  bancoDestino: "",
  referencia: "",
  estado: "pendiente",
  observaciones: "",
};

export default function TransferenciasPage() {
  const [clientes, setClientes] = useState<ClienteOpt[]>([]);
  const [items, setItems] = useState<Transferencia[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filtros, setFiltros] = useState({ q: "", estado: "", desde: "", hasta: "" });
  const [form, setForm] = useState(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [editar, setEditar] = useState<Transferencia | null>(null);
  const pageSize = 25;

  useEffect(() => {
    fetch("/api/clientes")
      .then((r) => r.json())
      .then((data) => setClientes(data.map((c: ClienteOpt) => ({ id: c.id, nombre: c.nombre }))))
      .catch(() => {});
  }, []);

  const cargar = useCallback(async () => {
    const sp = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (filtros.q) sp.set("q", filtros.q);
    if (filtros.estado) sp.set("estado", filtros.estado);
    if (filtros.desde) sp.set("desde", filtros.desde);
    if (filtros.hasta) sp.set("hasta", filtros.hasta);
    const res = await fetch(`/api/transferencias?${sp.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotal(data.total);
    }
  }, [page, filtros]);

  useEffect(() => {
    const t = setTimeout(cargar, 200);
    return () => clearTimeout(t);
  }, [cargar]);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (!form.monto) return;
    setGuardando(true);
    const res = await fetch("/api/transferencias", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, monto: parseFloat(form.monto) }),
    });
    setGuardando(false);
    if (res.ok) {
      setForm({ ...formVacio, fecha: hoy() });
      setPage(1);
      cargar();
    } else {
      const d = await res.json();
      alert(d.error ?? "Error al guardar");
    }
  }

  async function toggleEstado(t: Transferencia) {
    await fetch(`/api/transferencias/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: t.estado === "pendiente" ? "reflejada" : "pendiente",
      }),
    });
    cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta transferencia?")) return;
    await fetch(`/api/transferencias/${id}`, { method: "DELETE" });
    cargar();
  }

  const totalPaginas = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Transferencias</h1>

      {/* Formulario de registro */}
      <form onSubmit={crear} className="card grid gap-4 sm:grid-cols-3">
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
          <select
            className="input"
            value={form.clienteId}
            onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
          >
            <option value="">Sin cliente</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
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
          <select
            className="input"
            value={form.bancoOrigen}
            onChange={(e) => setForm({ ...form, bancoOrigen: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {BANCOS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Banco Destino</label>
          <select
            className="input"
            value={form.bancoDestino}
            onChange={(e) => setForm({ ...form, bancoDestino: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {BANCOS.map((b) => (
              <option key={b} value={b}>
                {b}
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
        <div className="sm:col-span-3">
          <label className="label">Observaciones</label>
          <textarea
            className="input"
            rows={2}
            value={form.observaciones}
            onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
          />
        </div>
        <div className="sm:col-span-3">
          <button className="btn-primary" disabled={guardando}>
            {guardando ? "Guardando…" : "✅ Guardar transferencia"}
          </button>
        </div>
      </form>

      {/* Filtros */}
      <div className="card grid gap-3 sm:grid-cols-4">
        <input
          className="input"
          placeholder="🔍 Cliente o referencia"
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
      <div className="card overflow-x-auto">
        <p className="mb-2 text-sm text-slate-500">{total} registro(s)</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2">Fecha</th>
              <th>Cliente</th>
              <th>Monto</th>
              <th>Referencia</th>
              <th>Estado</th>
              <th className="text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No hay transferencias.
                </td>
              </tr>
            ) : (
              items.map((t) => (
                <tr
                  key={t.id}
                  className={`border-b border-slate-100 ${
                    t.estado === "reflejada" ? "bg-green-50" : "bg-amber-50"
                  }`}
                >
                  <td className="py-2">{formatFecha(t.fecha)}</td>
                  <td>{t.cliente?.nombre ?? "—"}</td>
                  <td className="font-semibold">{formatMonto(t.monto, t.moneda)}</td>
                  <td className="text-slate-500">{t.referencia ?? "—"}</td>
                  <td>
                    <button
                      onClick={() => toggleEstado(t)}
                      className="text-xs font-medium underline"
                    >
                      {t.estado === "reflejada" ? "✅ Reflejada" : "⏳ Pendiente"}
                    </button>
                  </td>
                  <td className="text-right">
                    <button
                      onClick={() => setEditar(t)}
                      className="mr-1 rounded px-2 py-1 hover:bg-slate-200"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => eliminar(t.id)}
                      className="rounded px-2 py-1 hover:bg-red-100"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

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
          }}
        />
      )}
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
  clientes: ClienteOpt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    fecha: transferencia.fecha.slice(0, 10),
    clienteId: transferencia.clienteId ?? "",
    monto: String(transferencia.monto),
    moneda: transferencia.moneda,
    bancoOrigen: transferencia.bancoOrigen ?? "",
    bancoDestino: transferencia.bancoDestino ?? "",
    referencia: transferencia.referencia ?? "",
    estado: transferencia.estado,
    observaciones: transferencia.observaciones ?? "",
  });
  const [guardando, setGuardando] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch(`/api/transferencias/${transferencia.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, monto: parseFloat(form.monto) }),
    });
    setGuardando(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={guardar}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
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
            <select
              className="input"
              value={form.clienteId}
              onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
            >
              <option value="">Sin cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
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
