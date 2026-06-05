"use client";

import { useEffect, useRef, useState } from "react";
import { IconX } from "@/components/icons";

type Opt = { id: string; nombre: string };

// Buscador de cliente con autocompletado: escribes y filtra al instante.
export default function ClienteCombobox({
  clientes,
  value,
  onChange,
  placeholder = "Buscar cliente…",
}: {
  clientes: Opt[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Mantiene el texto sincronizado con el cliente seleccionado.
  useEffect(() => {
    const sel = clientes.find((c) => c.id === value);
    setTexto(sel ? sel.nombre : "");
  }, [value, clientes]);

  // Cierra al hacer clic fuera.
  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, []);

  const filtro = texto.trim().toLowerCase();
  const filtrados = filtro
    ? clientes.filter((c) => c.nombre.toLowerCase().includes(filtro))
    : clientes;

  function seleccionar(c: Opt) {
    onChange(c.id);
    setTexto(c.nombre);
    setAbierto(false);
  }

  return (
    <div className="relative" ref={ref}>
      <input
        className="input"
        value={texto}
        placeholder={placeholder}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          if (e.target.value === "") onChange("");
        }}
        onFocus={() => setAbierto(true)}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("");
            setTexto("");
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Quitar cliente"
        >
          <IconX className="h-4 w-4" />
        </button>
      )}
      {abierto && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {filtrados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">Sin coincidencias</p>
          ) : (
            filtrados.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => seleccionar(c)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                  c.id === value ? "bg-indigo-50 font-medium dark:bg-slate-700" : ""
                }`}
              >
                {c.nombre}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
