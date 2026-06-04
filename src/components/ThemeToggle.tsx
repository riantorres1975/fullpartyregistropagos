"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [oscuro, setOscuro] = useState(false);

  useEffect(() => {
    setOscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    document.documentElement.classList.toggle("dark", nuevo);
    try {
      localStorage.setItem("tema", nuevo ? "dark" : "light");
    } catch {}
  }

  return (
    <button
      onClick={alternar}
      className="rounded-lg bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25"
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label="Cambiar tema"
    >
      {oscuro ? "☀️" : "🌙"}
    </button>
  );
}
