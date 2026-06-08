"use client";

import useSWR, { useSWRConfig } from "swr";
import { formatMonto, formatFecha } from "@/lib/format";
import { toast } from "@/lib/toast";
import { Skeleton } from "@/components/Skeleton";
import {
  IconTrashBin,
  IconRestore,
  IconTrash,
  IconTransfer,
  IconUsers,
} from "@/components/icons";

type TxBorrada = {
  id: string;
  fecha: string;
  monto: number;
  moneda: string;
  estado: string;
  referencia: string | null;
  deletedAt: string;
  cliente: string | null;
};
type ClienteBorrado = {
  id: string;
  nombre: string;
  deletedAt: string;
  totalTransferencias: number;
};
type Papelera = { transferencias: TxBorrada[]; clientes: ClienteBorrado[] };

export default function PapeleraPage() {
  const { data, isLoading, mutate } = useSWR<Papelera>("/api/papelera");
  const { mutate: globalMutate } = useSWRConfig();

  const txs = data?.transferencias ?? [];
  const clientes = data?.clientes ?? [];
  const vacia = txs.length === 0 && clientes.length === 0;

  // Refresca papelera + las listas afectadas para que el cambio se vea al instante.
  function refrescarTodo() {
    mutate();
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/transferencias"),
    );
    globalMutate("/api/clientes");
    globalMutate("/api/dashboard");
  }

  async function restaurar(tipo: "transferencia" | "cliente", id: string) {
    const res = await fetch("/api/papelera", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, id }),
    });
    if (res.ok) {
      refrescarTodo();
      toast("Restaurado");
    } else {
      toast("No se pudo restaurar", "error");
    }
  }

  async function borrarDefinitivo(tipo: "transferencia" | "cliente", id: string) {
    if (
      !confirm(
        "Esto borra el elemento DEFINITIVAMENTE y ya no se podrá recuperar. ¿Continuar?",
      )
    )
      return;
    const res = await fetch(`/api/papelera?tipo=${tipo}&id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      mutate();
      toast("Borrado definitivo");
    } else {
      toast("No se pudo borrar", "error");
    }
  }

  async function vaciar() {
    if (
      !confirm(
        "Esto borra DEFINITIVAMENTE todo lo que hay en la papelera. ¿Continuar?",
      )
    )
      return;
    const res = await fetch("/api/papelera?tipo=all", { method: "DELETE" });
    if (res.ok) {
      mutate();
      toast("Papelera vaciada");
    } else {
      toast("No se pudo vaciar", "error");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <IconTrashBin className="h-6 w-6 text-rose-500" /> Papelera
        </h1>
        {!vacia && (
          <button onClick={vaciar} className="btn-danger px-3 py-1.5 text-sm">
            <IconTrash className="h-4 w-4" /> Vaciar papelera
          </button>
        )}
      </div>
      <p className="-mt-3 text-sm text-slate-500">
        Lo que borras llega aquí. Puedes <strong>restaurarlo</strong> o
        eliminarlo <strong>definitivamente</strong>.
      </p>

      {isLoading ? (
        <Skeleton className="h-32" />
      ) : vacia ? (
        <div className="card py-12 text-center text-slate-400">
          <IconTrashBin className="mx-auto mb-2 h-10 w-10 opacity-50" />
          La papelera está vacía.
        </div>
      ) : (
        <>
          {/* Transferencias borradas */}
          {txs.length > 0 && (
            <div className="card space-y-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <IconTransfer className="h-4 w-4" /> Transferencias ({txs.length})
              </h2>
              <div className="space-y-2">
                {txs.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">
                        {formatMonto(t.monto, t.moneda)}{" "}
                        <span className="text-xs font-normal text-slate-400">
                          · {t.cliente ?? "Sin cliente"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatFecha(t.fecha)}
                        {t.referencia ? ` · Ref: ${t.referencia}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => restaurar("transferencia", t.id)}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        <IconRestore className="h-4 w-4" /> Restaurar
                      </button>
                      <button
                        onClick={() => borrarDefinitivo("transferencia", t.id)}
                        className="btn-danger px-3 py-1.5 text-xs"
                      >
                        <IconTrash className="h-4 w-4" /> Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clientes borrados */}
          {clientes.length > 0 && (
            <div className="card space-y-3">
              <h2 className="flex items-center gap-2 font-semibold">
                <IconUsers className="h-4 w-4" /> Clientes ({clientes.length})
              </h2>
              <div className="space-y-2">
                {clientes.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-700/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold">{c.nombre}</p>
                      <p className="text-xs text-slate-400">
                        {c.totalTransferencias} transferencia(s) en su historial
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => restaurar("cliente", c.id)}
                        className="btn-secondary px-3 py-1.5 text-xs"
                      >
                        <IconRestore className="h-4 w-4" /> Restaurar
                      </button>
                      <button
                        onClick={() => borrarDefinitivo("cliente", c.id)}
                        className="btn-danger px-3 py-1.5 text-xs"
                      >
                        <IconTrash className="h-4 w-4" /> Borrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
