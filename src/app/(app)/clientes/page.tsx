"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { BANCOS } from "@/lib/bancos";
import { formatMonto, formatFecha, agruparNumero } from "@/lib/format";
import { toast } from "@/lib/toast";
import BancoSelect from "@/components/BancoSelect";
import {
  IconTrash,
  IconEye,
  IconEyeOff,
  IconChart,
  IconCheckCircle,
  IconPencil,
  IconCheck,
  IconX,
  IconCopy,
} from "@/components/icons";

const tipoLabel = (tipo: string) =>
  tipo === "tarjeta" ? "Tarjeta" : tipo === "clabe" ? "CLABE" : "Cuenta";

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
  meta: number | null;
  metaDesde: string | null;
  avance: { pendiente: number; reflejada: number };
  totalTransferencias: number;
  cuentas: Cuenta[];
};

export default function ClientesPage() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", alias: "", notas: "" });
  const [guardando, setGuardando] = useState(false);

  // Espera 250 ms tras dejar de teclear antes de pedir al servidor.
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 250);
    return () => clearTimeout(t);
  }, [q]);

  const { data: clientes = [], mutate } = useSWR<Cliente[]>(
    `/api/clientes?q=${encodeURIComponent(qDebounced)}`,
  );
  const cargar = () => mutate();

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
      toast("Cliente agregado");
    } else {
      toast("No se pudo agregar el cliente", "error");
    }
  }

  async function eliminarCliente(id: string) {
    if (!confirm("¿Eliminar este cliente y sus cuentas guardadas?")) return;
    await fetch(`/api/clientes/${id}`, { method: "DELETE" });
    cargar();
    toast("Cliente eliminado");
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
        placeholder="Buscar cliente…"
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
  const [eligiendoCopia, setEligiendoCopia] = useState(false);
  const [copiando, setCopiando] = useState(false);

  // Copia los datos de una cuenta al portapapeles en formato:
  // Nombre / Tipo: número agrupado / Banco
  async function copiarCuenta(cuenta: Cuenta) {
    setCopiando(true);
    try {
      const res = await fetch(`/api/cuentas/${cuenta.id}?reveal=1`);
      if (!res.ok) throw new Error();
      const { numero } = await res.json();
      const texto = `${cliente.nombre}\n${tipoLabel(cuenta.tipo)}: ${agruparNumero(numero)}\n${cuenta.banco}`;
      await navigator.clipboard.writeText(texto);
      toast("Datos copiados");
      setEligiendoCopia(false);
    } catch {
      toast("No se pudo copiar", "error");
    } finally {
      setCopiando(false);
    }
  }

  function onCopiar() {
    if (cliente.cuentas.length === 0) {
      toast("Este cliente no tiene cuentas guardadas", "info");
      return;
    }
    if (cliente.cuentas.length === 1) {
      copiarCuenta(cliente.cuentas[0]);
    } else {
      setEligiendoCopia((v) => !v);
    }
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{cliente.nombre}</h3>
          {cliente.alias && (
            <p className="text-sm text-slate-400">{cliente.alias}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {cliente.cuentas.length} cuenta(s) · {cliente.totalTransferencias} transferencia(s)
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {cliente.cuentas.length > 0 && (
            <button
              onClick={onCopiar}
              className="btn-secondary px-3 py-1.5"
              title="Copiar datos de la cuenta"
              disabled={copiando}
            >
              <IconCopy className="h-4 w-4" />
              <span className="hidden sm:inline">Copiar</span>
            </button>
          )}
          <button
            onClick={() => setAbierto((v) => !v)}
            className="btn-secondary px-3 py-1.5"
          >
            {abierto ? "Cerrar" : "Cuentas"}
          </button>
          <button
            onClick={onDelete}
            className="btn-danger px-3 py-1.5"
            title="Eliminar cliente"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selector de cuenta a copiar (cuando hay varias). */}
      {eligiendoCopia && cliente.cuentas.length > 1 && (
        <div className="mt-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
          <p className="mb-1.5 px-1 text-xs font-medium text-slate-500">
            ¿Cuál cuenta copio?
          </p>
          <div className="space-y-1">
            {cliente.cuentas.map((cuenta) => (
              <button
                key={cuenta.id}
                onClick={() => copiarCuenta(cuenta)}
                disabled={copiando}
                className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <span className="truncate">
                  {cuenta.banco}{" "}
                  <span className="text-xs uppercase text-slate-400">
                    ({tipoLabel(cuenta.tipo)})
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs text-slate-500">
                  {cuenta.enmascarado}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <MetaCliente cliente={cliente} onChange={onChange} />

      {abierto && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-700">
          {cliente.cuentas.map((cuenta) => (
            <CuentaRow key={cuenta.id} cuenta={cuenta} onChange={onChange} />
          ))}
          <NuevaCuenta clienteId={cliente.id} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

// Meta de transferencia del cliente: barra de avance (reflejado + pendiente)
// contra el objetivo en MXN, con edición inline. La meta es opcional.
function MetaCliente({
  cliente,
  onChange,
}: {
  cliente: Cliente;
  onChange: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(
    cliente.meta != null ? String(cliente.meta) : "",
  );
  const [guardando, setGuardando] = useState(false);

  async function guardar(metaMonto: number | null) {
    setGuardando(true);
    const res = await fetch(`/api/clientes/${cliente.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metaMonto }),
    });
    setGuardando(false);
    if (res.ok) {
      setEditando(false);
      onChange();
      toast(metaMonto == null ? "Meta quitada" : "Meta guardada");
    } else {
      toast("No se pudo guardar la meta", "error");
    }
  }

  // Sin meta y sin editar: botón para agregarla.
  if (cliente.meta == null && !editando) {
    return (
      <button
        onClick={() => {
          setValor("");
          setEditando(true);
        }}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
      >
        <IconChart className="h-3.5 w-3.5" /> Agregar meta
      </button>
    );
  }

  // Modo edición.
  if (editando) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const n = parseFloat(valor);
          if (n > 0) guardar(n);
        }}
        className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700"
      >
        <span className="text-xs font-medium text-slate-500">Meta (MXN)</span>
        <input
          type="number"
          step="0.01"
          autoFocus
          className="input max-w-[140px] py-1.5"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="0.00"
        />
        <button className="btn-primary px-3 py-1.5 text-xs" disabled={guardando}>
          <IconCheck className="h-3.5 w-3.5" /> Guardar
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          className="btn-secondary px-3 py-1.5 text-xs"
        >
          <IconX className="h-3.5 w-3.5" /> Cancelar
        </button>
        {cliente.meta != null && (
          <button
            type="button"
            onClick={() => guardar(null)}
            className="btn-danger px-3 py-1.5 text-xs"
            disabled={guardando}
          >
            <IconTrash className="h-3.5 w-3.5" /> Quitar
          </button>
        )}
      </form>
    );
  }

  // Con meta: barra de avance.
  const meta = cliente.meta!;
  const { pendiente, reflejada } = cliente.avance;
  const total = pendiente + reflejada;
  const cumplida = total >= meta;
  const falta = Math.max(0, meta - total);
  const anchoRef = Math.min(100, (reflejada / meta) * 100);
  const anchoPend = Math.min(100 - anchoRef, (pendiente / meta) * 100);

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-700">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
          <IconChart className="h-3.5 w-3.5" /> Meta: {formatMonto(meta, "MXN")}
          {cliente.metaDesde && (
            <span className="font-normal text-slate-400">
              desde {formatFecha(cliente.metaDesde)}
            </span>
          )}
        </span>
        <button
          onClick={() => {
            setValor(String(meta));
            setEditando(true);
          }}
          className="flex items-center gap-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
          title="Editar meta"
        >
          <IconPencil className="h-3.5 w-3.5" /> Editar
        </button>
      </div>

      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="bg-emerald-500" style={{ width: `${anchoRef}%` }} />
        <div className="bg-amber-400" style={{ width: `${anchoPend}%` }} />
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
        <span className="flex items-center gap-1 text-emerald-600">
          <IconCheckCircle className="h-3.5 w-3.5" /> {formatMonto(reflejada, "MXN")}
        </span>
        {pendiente > 0 && (
          <span className="text-amber-600">
            + {formatMonto(pendiente, "MXN")} pendiente
          </span>
        )}
        {cumplida ? (
          <span className="font-semibold text-emerald-600">✓ Meta cumplida</span>
        ) : (
          <span className="text-slate-500">
            Faltan {formatMonto(falta, "MXN")}
          </span>
        )}
      </div>
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
    toast("Cuenta eliminada");
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-700/50">
      <div>
        <p className="font-medium">
          {cuenta.banco}{" "}
          <span className="text-xs uppercase text-slate-400">({cuenta.tipo})</span>
        </p>
        <p className="font-mono">
          {revelado ? agruparNumero(revelado) : cuenta.enmascarado}
        </p>
        {cuenta.titular && (
          <p className="text-xs text-slate-400">Titular: {cuenta.titular}</p>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={toggle} className="btn-secondary px-2 py-1 text-xs">
          {revelado ? (
            <>
              <IconEyeOff className="h-3.5 w-3.5" /> Ocultar
            </>
          ) : (
            <>
              <IconEye className="h-3.5 w-3.5" /> Mostrar
            </>
          )}
        </button>
        <button
          onClick={eliminar}
          className="btn-danger px-2 py-1 text-xs"
          title="Eliminar cuenta"
        >
          <IconTrash className="h-3.5 w-3.5" />
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
      toast("Cuenta agregada y cifrada");
    } else {
      toast("No se pudo agregar la cuenta", "error");
    }
  }

  return (
    <form
      onSubmit={agregar}
      className="grid gap-2 rounded-lg border border-dashed border-slate-300 p-3 sm:grid-cols-5 dark:border-slate-600"
    >
      <BancoSelect
        opciones={BANCOS}
        value={form.banco}
        onChange={(b) => setForm({ ...form, banco: b })}
        placeholder="Banco…"
      />
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
