"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/components/icons";

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
      className="flex items-center justify-center rounded-lg bg-black/5 p-2 text-slate-600 hover:bg-black/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:bg-white/15 sm:text-white sm:hover:bg-white/25"
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label="Cambiar tema"
    >
      {oscuro ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
    </button>
  );
}
