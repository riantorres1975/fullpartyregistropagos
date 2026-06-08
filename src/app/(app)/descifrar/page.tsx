"use client";

import { useState } from "react";
import { descifrarTexto } from "@/lib/cifradoCliente";
import { toast } from "@/lib/toast";
import { IconLock, IconDownload } from "@/components/icons";

export default function DescifrarPage() {
  const [archivo, setArchivo] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [password, setPassword] = useState("");
  const [procesando, setProcesando] = useState(false);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setNombre(file.name);
    const reader = new FileReader();
    reader.onload = () => setArchivo(String(reader.result ?? ""));
    reader.readAsText(file);
  }

  async function descifrar() {
    if (!archivo) {
      toast("Elige primero el archivo cifrado", "error");
      return;
    }
    setProcesando(true);
    try {
      const plano = await descifrarTexto(archivo, password);
      const blob = new Blob([plano], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `respaldo-descifrado-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Descifrado correcto. Se descargó el respaldo legible.");
    } catch {
      toast("No se pudo descifrar. Revisa la contraseña o el archivo.", "error");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl font-bold">
        <IconLock className="h-6 w-6 text-violet-500" /> Descifrar respaldo
      </h1>
      <div className="card space-y-4">
        <p className="text-sm text-slate-500">
          Sube un archivo de <strong>respaldo cifrado</strong> y escribe la
          contraseña con la que lo protegiste. Todo ocurre en tu dispositivo; el
          archivo no se sube a ningún servidor.
        </p>
        <div>
          <label className="label">Archivo cifrado (.json)</label>
          <input
            type="file"
            accept="application/json,.json"
            onChange={onFile}
            className="input file:mr-2 file:rounded file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-white"
          />
          {nombre && (
            <p className="mt-1 text-xs text-slate-400">Seleccionado: {nombre}</p>
          )}
        </div>
        <div>
          <label className="label">Contraseña del respaldo</label>
          <input
            type="password"
            className="input max-w-xs"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="off"
          />
        </div>
        <button onClick={descifrar} className="btn-primary" disabled={procesando}>
          <IconDownload className="h-4 w-4" />
          {procesando ? "Descifrando…" : "Descifrar y descargar"}
        </button>
      </div>
    </div>
  );
}
