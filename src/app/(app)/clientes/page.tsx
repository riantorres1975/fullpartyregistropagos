"use client";

import { useCallback, useEffect, useState } from "react";
import { BANCOS } from "@/lib/bancos";

type Cuenta = {
  id: string;
  banco: string;
  tipo: string;
  titular: string | null;
  last4: string;
  enmascarado: string;
};

type Cliente = {
  id: string;
  nombre: string;
  alias: string | null;
  notas: string | null;
  totalTransferencias: number;
  cuentas: Cuenta[];
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [q, setQ] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", alias: "", notas: "" });
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const res = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
    if (res.ok) setClientes(await res.json());
  }, [q]);

  useEffect(() => {
    const t = setTimeout(cargar, 200);
    return () => clearTimeout(t);
  }, [cargar]);

  async function crearCliente(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevo.nombre.trim()) return;
    setGuardando(true);
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevo),
    });
    setGuardando(false);
    if (res.ok) {
      setNuevo({ nombre: "", alias: "", notas: "" });
      cargar();
    }
  }

  async function eliminarCliente(id: string) {
    if (!confirm("¿Eliminar este cliente y sus cuentas guardadas?")) return;
    await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    cargar();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Clientes</h1>

      <form onSubmit={crearCliente} className="card grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label">Nombre *</label>
          <input
            className="input"
            value={nuevo.nombre}
            onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
            placeholder="Nombre del cliente"
            required
          />
        </div>
        <div>
          <label className="label">Alias</label>
          <input
            className="input"
            value={nuevo.alias}
            onChange={(e) => setNuevo({ ...nuevo, alias: e.target.value })}
            placeholder="Opcional"
          />
        </div>
        <div className="flex items-end">
          <button className="btn-primary w-full" disabled={guardando}>
            {guardando ? "Guardando…" : "+ Agregar cliente"}
          </button>
        </div>
      </form>

      <input
        className="input"
        placeholder="🔍 Buscar cliente…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {clientes.length === 0 ? (
        <p className="text-sm text-slate-400">No hay clientes todavía.</p>
      ) : (
        <div className="space-y-4">
          {clientes.map((c) => (
            <ClienteCard
              key={c.id}
              cliente={c}
              onChange={cargar}
              onDelete={() => eliminarCliente(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ClienteCard({
  cliente,
  onChange,
  onDelete,
}: {
  cliente: Cliente;
  onChange: () => void;
  onDelete: () => void;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{cliente.nombre}</h3>
          {cliente.alias && (
            <p className="text-sm text-slate-400">{cliente.alias}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {cliente.cuentas.length} cuenta(s) · {cliente.totalTransferencias} transferencia(s)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAbierto((v) => !v)}
            className="btn-secondary px-3 py-1.5"
          >
            {abierto ? "Cerrar" : "Cuentas"}
          </button>
          <button onClick={onDelete} className="btn-danger px-3 py-1.5">
            🗑️
          </button>
        </div>
      </div>

      {abierto && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {cliente.cuentas.map((cuenta) => (
            <CuentaRow key={cuenta.id} cuenta={cuenta} onChange={onChange} />
          ))}
          <NuevaCuenta clienteId={cliente.id} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

function CuentaRow({ cuenta, onChange }: { cuenta: Cuenta; onChange: () => void }) {
  const [revelado, setRevelado] = useState<string | null>(null);

  async function toggle() {
    if (revelado) {
      setRevelado(null);
      return;
    }
    const res = await fetch(`/api/cuentas/${cuenta.id}?reveal=1`);
    if (res.ok) setRevelado((await res.json()).numero);
  }

  async function eliminar() {
    if (!confirm("¿Eliminar esta cuenta?")) return;
    await fetch(`/api/cuentas/${cuenta.id}`, { method: "DELETE" });
    onChange();
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
      <div>
        <p className="font-medium">
          {cuenta.banco}{" "}
          <span className="text-xs uppercase text-slate-400">({cuenta.tipo})</span>
        </p>
        <p className="font-mono">{revelado ?? cuenta.enmascarado}</p>
        {cuenta.titular && (
          <p className="text-xs text-slate-400">Titular: {cuenta.titular}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={toggle} className="btn-secondary px-2 py-1 text-xs">
          {revelado ? "🙈 Ocultar" : "👁 Mostrar"}
        </button>
        <button onClick={eliminar} className="btn-danger px-2 py-1 text-xs">
          🗑️
        </button>
      </div>
    </div>
  );
}

function NuevaCuenta({
  clienteId,
  onChange,
}: {
  clienteId: string;
  onChange: () => void;
}) {
  const [form, setForm] = useState({
    banco: "",
    tipo: "cuenta",
    titular: "",
    numero: "",
  });
  const [guardando, setGuardando] = useState(false);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    if (!form.banco || !form.numero) return;
    setGuardando(true);
    const res = await fetch("/api/cuentas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, clienteId }),
    });
    setGuardando(false);
    if (res.ok) {
      setForm({ banco: "", tipo: "cuenta", titular: "", numero: "" });
      onChange();
    }
  }

  return (
    <form
      onSubmit={agregar}
      className="grid gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-5"
    >
      <select
        className="input"
        value={form.banco}
        onChange={(e) => setForm({ ...form, banco: e.target.value })}
        required
      >
        <option value="">Banco…</option>
        {BANCOS.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <select
        className="input"
        value={form.tipo}
        onChange={(e) => setForm({ ...form, tipo: e.target.value })}
      >
        <option value="cuenta">Cuenta</option>
        <option value="tarjeta">Tarjeta</option>
        <option value="clabe">CLABE</option>
      </select>
      <input
        className="input"
        placeholder="Número"
        value={form.numero}
        onChange={(e) => setForm({ ...form, numero: e.target.value })}
        required
      />
      <input
        className="input"
        placeholder="Titular (opcional)"
        value={form.titular}
        onChange={(e) => setForm({ ...form, titular: e.target.value })}
      />
      <button className="btn-primary" disabled={guardando}>
        {guardando ? "…" : "+ Cuenta"}
      </button>
    </form>
  );
}
