"use client";

import { useEffect, useRef, useState } from "react";

// Selector de banco con mini-buscador: escribes y filtra la lista.
export default function BancoSelect({
  opciones,
  value,
  onChange,
  placeholder = "Buscar banco…",
}: {
  opciones: string[];
  value: string;
  onChange: (banco: string) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTexto(value || "");
  }, [value]);

  useEffect(() => {
    function onClickFuera(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
        // Si lo escrito no coincide con la selección, restaura el valor.
        setTexto(value || "");
      }
    }
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, [value]);

  const filtro = texto.trim().toLowerCase();
  const coincideExacto = opciones.some((o) => o === texto);
  const filtrados =
    filtro && !coincideExacto
      ? opciones.filter((o) => o.toLowerCase().includes(filtro))
      : opciones;

  function seleccionar(b: string) {
    onChange(b);
    setTexto(b);
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
          aria-label="Quitar banco"
        >
          ✕
        </button>
      )}
      {abierto && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800">
          {filtrados.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">Sin coincidencias</p>
          ) : (
            filtrados.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => seleccionar(b)}
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                  b === value ? "bg-indigo-50 font-medium dark:bg-slate-700" : ""
                }`}
              >
                {b}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
