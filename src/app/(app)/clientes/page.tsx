"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { BANCOS } from "@/lib/bancos";
import {
  formatMonto,
  formatFecha,
  agruparNumero,
  detectarTipoCuenta,
} from "@/lib/format";
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
  IconSearch,
  IconPlus,
  IconUsers,
  IconWhatsApp,
  IconTransfer,
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
  whatsapp: string | null;
  meta: number | null;
  metaDesde: string | null;
  avance: { pendiente: number; reflejada: number };
  totalTransferencias: number;
  cuentas: Cuenta[];
};

export default function ClientesPage() {
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [nuevo, setNuevo] = useState({ nombre: "", alias: "", whatsapp: "", notas: "" });
  const [guardando, setGuardando] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);

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
      setNuevo({ nombre: "", alias: "", whatsapp: "", notas: "" });
      setMostrarForm(false);
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

  const buscando = qDebounced.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Encabezado: título + botón de alta */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="flex min-w-0 items-center gap-2 text-2xl font-bold">
          <IconUsers className="h-6 w-6 shrink-0 text-violet-500" /> Clientes
        </h1>
        <button
          onClick={() => setMostrarForm((v) => !v)}
          className={`${mostrarForm ? "btn-secondary" : "btn-primary"} shrink-0`}
        >
          {mostrarForm ? (
            <>
              <IconX className="h-4 w-4" /> Cancelar
            </>
          ) : (
            <>
              <IconPlus className="h-4 w-4" /> Nuevo{" "}
              <span className="hidden sm:inline">cliente</span>
            </>
          )}
        </button>
      </div>

      {/* Formulario de alta (plegable, solo cuando se pide) */}
      {mostrarForm && (
        <form
          onSubmit={crearCliente}
          className="card grid gap-4 border-2 border-violet-200 sm:grid-cols-3 dark:border-violet-500/30"
        >
          <div className="sm:col-span-3">
            <h2 className="flex items-center gap-2 font-semibold">
              <IconPlus className="h-4 w-4 text-violet-500" /> Agregar nuevo cliente
            </h2>
          </div>
          <div>
            <label className="label">Nombre *</label>
            <input
              className="input"
              autoFocus
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
          <div>
            <label className="label flex items-center gap-1.5">
              <IconWhatsApp className="h-3.5 w-3.5 text-green-600" /> WhatsApp
            </label>
            <input
              className="input"
              type="tel"
              inputMode="tel"
              value={nuevo.whatsapp}
              onChange={(e) => setNuevo({ ...nuevo, whatsapp: e.target.value })}
              placeholder="Ej. 55 1234 5678 (opcional)"
            />
          </div>
          <div className="flex items-end sm:col-span-2">
            <button className="btn-primary w-full" disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar cliente"}
            </button>
          </div>
        </form>
      )}

      {/* Buscador destacado, claramente distinto del alta */}
      <div className="relative">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-11 pr-10"
          placeholder="Buscar cliente por nombre o alias…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700"
            title="Limpiar búsqueda"
          >
            <IconX className="h-4 w-4" />
          </button>
        )}
      </div>

      {clientes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
          {buscando
            ? `No se encontró ningún cliente con “${qDebounced}”.`
            : "No hay clientes todavía. Usa “Nuevo cliente” para agregar el primero."}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}
            {buscando ? ` encontrado${clientes.length !== 1 ? "s" : ""}` : ""}
          </p>
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
  // Qué acción está esperando que se elija una cuenta (cuando hay varias).
  const [accion, setAccion] = useState<"copiar" | "whatsapp" | null>(null);
  const [procesando, setProcesando] = useState(false);

  // Obtiene el número descifrado de una cuenta (queda auditado en el server).
  async function revelarNumero(cuentaId: string): Promise<string> {
    const res = await fetch(`/api/cuentas/${cuentaId}?reveal=1`);
    if (!res.ok) throw new Error();
    return (await res.json()).numero as string;
  }

  // Texto compartible de una cuenta: Nombre / Tipo: número / Banco
  async function textoCuenta(cuenta: Cuenta): Promise<string> {
    const numero = await revelarNumero(cuenta.id);
    return `${cliente.nombre}\n${tipoLabel(cuenta.tipo)}: ${agruparNumero(numero)}\n${cuenta.banco}`;
  }

  async function copiarCuenta(cuenta: Cuenta) {
    setProcesando(true);
    try {
      await navigator.clipboard.writeText(await textoCuenta(cuenta));
      toast("Datos copiados");
      setAccion(null);
    } catch {
      toast("No se pudo copiar", "error");
    } finally {
      setProcesando(false);
    }
  }

  // Abre WhatsApp del cliente con los datos de la cuenta ya escritos.
  async function whatsappCuenta(cuenta: Cuenta) {
    setProcesando(true);
    try {
      const texto = await textoCuenta(cuenta);
      const url = `https://wa.me/${cliente.whatsapp}?text=${encodeURIComponent(texto)}`;
      window.open(url, "_blank", "noopener");
      setAccion(null);
    } catch {
      toast("No se pudo preparar el mensaje", "error");
    } finally {
      setProcesando(false);
    }
  }

  // Dispara una acción que necesita una cuenta: 0 = avisa, 1 = directo, varias = elegir.
  function iniciar(tipo: "copiar" | "whatsapp") {
    if (cliente.cuentas.length === 0) {
      if (tipo === "whatsapp" && cliente.whatsapp) {
        window.open(`https://wa.me/${cliente.whatsapp}`, "_blank", "noopener");
      } else {
        toast("Este cliente no tiene cuentas guardadas", "info");
      }
      return;
    }
    if (cliente.cuentas.length === 1) {
      tipo === "copiar" ? copiarCuenta(cliente.cuentas[0]) : whatsappCuenta(cliente.cuentas[0]);
    } else {
      setAccion((a) => (a === tipo ? null : tipo));
    }
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="truncate font-semibold">{cliente.nombre}</h3>
          {cliente.alias && (
            <p className="truncate text-sm text-slate-400">{cliente.alias}</p>
          )}
          <p className="mt-1 text-xs text-slate-400">
            {cliente.cuentas.length} cuenta(s) · {cliente.totalTransferencias} transferencia(s)
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {cliente.whatsapp && (
            <button
              onClick={() => iniciar("whatsapp")}
              className="btn-secondary px-3 py-2 text-green-700 sm:py-1.5 dark:text-green-400"
              title="Enviar datos por WhatsApp"
              disabled={procesando}
            >
              <IconWhatsApp className="h-4 w-4" />
              <span>WhatsApp</span>
            </button>
          )}
          {cliente.cuentas.length > 0 && (
            <button
              onClick={() => iniciar("copiar")}
              className="btn-secondary px-3 py-2 sm:py-1.5"
              title="Copiar datos de la cuenta"
              disabled={procesando}
            >
              <IconCopy className="h-4 w-4" />
              <span>Copiar</span>
            </button>
          )}
          <Link
            href={`/transferencias?cliente=${cliente.id}`}
            className="btn-secondary px-3 py-2 sm:py-1.5"
            title="Ver sus transferencias"
          >
            <IconTransfer className="h-4 w-4" />
            <span>Movimientos</span>
          </Link>
          <button
            onClick={() => setAbierto((v) => !v)}
            className="btn-secondary px-3 py-2 sm:py-1.5"
          >
            {abierto ? "Cerrar" : "Cuentas"}
          </button>
          <button
            onClick={onDelete}
            className="btn-danger shrink-0 px-3 py-2 sm:py-1.5"
            title="Eliminar cliente"
            aria-label="Eliminar cliente"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Selector de cuenta (cuando hay varias) para copiar o enviar por WhatsApp. */}
      {accion && cliente.cuentas.length > 1 && (
        <div className="mt-3 rounded-lg border border-slate-200 p-2 dark:border-slate-700">
          <p className="mb-1.5 px-1 text-xs font-medium text-slate-500">
            {accion === "copiar" ? "¿Cuál cuenta copio?" : "¿Cuál cuenta envío?"}
          </p>
          <div className="space-y-1">
            {cliente.cuentas.map((cuenta) => (
              <button
                key={cuenta.id}
                onClick={() =>
                  accion === "copiar" ? copiarCuenta(cuenta) : whatsappCuenta(cuenta)
                }
                disabled={procesando}
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

      <WhatsAppCliente cliente={cliente} onChange={onChange} />
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

// WhatsApp del cliente: muestra el número (formateado) con edición inline,
// o un botón para agregarlo si aún no tiene.
function WhatsAppCliente({
  cliente,
  onChange,
}: {
  cliente: Cliente;
  onChange: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(cliente.whatsapp ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar(whatsapp: string | null) {
    setGuardando(true);
    const res = await fetch(`/api/clientes/${cliente.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ whatsapp }),
    });
    setGuardando(false);
    if (res.ok) {
      setEditando(false);
      onChange();
      toast(whatsapp ? "WhatsApp guardado" : "WhatsApp quitado");
    } else {
      toast("No se pudo guardar el WhatsApp", "error");
    }
  }

  if (editando) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          guardar(valor.replace(/\D/g, "") || null);
        }}
        className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-700"
      >
        <IconWhatsApp className="h-4 w-4 text-green-600" />
        <input
          type="tel"
          inputMode="tel"
          autoFocus
          className="input max-w-[180px] py-1.5"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ej. 55 1234 5678"
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
        {cliente.whatsapp && (
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

  if (!cliente.whatsapp) {
    return (
      <button
        onClick={() => {
          setValor("");
          setEditando(true);
        }}
        className="mt-3 flex items-center gap-1.5 text-xs font-medium text-green-600 hover:underline dark:text-green-400"
      >
        <IconWhatsApp className="h-3.5 w-3.5" /> Agregar WhatsApp
      </button>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700">
      <IconWhatsApp className="h-3.5 w-3.5 text-green-600" />
      <span>{cliente.whatsapp}</span>
      <button
        onClick={() => {
          setValor(cliente.whatsapp ?? "");
          setEditando(true);
        }}
        className="flex items-center gap-1 text-slate-400 hover:text-green-600 dark:hover:text-green-400"
        title="Editar WhatsApp"
      >
        <IconPencil className="h-3.5 w-3.5" /> Editar
      </button>
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
  // Mientras sea false, el tipo se detecta solo al teclear el número.
  // Si el usuario elige el tipo a mano, dejamos de auto-cambiarlo.
  const [tipoManual, setTipoManual] = useState(false);
  const [autodetectado, setAutodetectado] = useState(false);
  const [guardando, setGuardando] = useState(false);

  function onNumeroChange(numero: string) {
    setForm((f) => {
      if (tipoManual) return { ...f, numero };
      const det = detectarTipoCuenta(numero);
      setAutodetectado(!!det);
      return { ...f, numero, tipo: det ?? f.tipo };
    });
  }

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
      setTipoManual(false);
      setAutodetectado(false);
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
      <div className="relative">
        <select
          className="input"
          value={form.tipo}
          onChange={(e) => {
            setTipoManual(true);
            setAutodetectado(false);
            setForm({ ...form, tipo: e.target.value });
          }}
        >
          <option value="cuenta">Cuenta</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="clabe">CLABE</option>
        </select>
        {autodetectado && !tipoManual && (
          <span className="pointer-events-none absolute -top-2 right-2 rounded-full bg-violet-100 px-1.5 text-[10px] font-semibold text-violet-600 dark:bg-violet-500/20 dark:text-violet-300">
            auto
          </span>
        )}
      </div>
      <input
        className="input"
        placeholder="Número"
        inputMode="numeric"
        value={form.numero}
        onChange={(e) => onNumeroChange(e.target.value)}
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
