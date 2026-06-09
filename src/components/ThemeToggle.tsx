"use client";

import { useEffect, useState } from "react";
import { IconSun, IconMoon } from "@/components/icons";

export default function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
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
      className={
        className ??
        "flex items-center justify-center rounded-lg bg-white/15 p-2 text-white hover:bg-white/25"
      }
      title={oscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label="Cambiar tema"
    >
      {oscuro ? <IconSun className="h-4 w-4" /> : <IconMoon className="h-4 w-4" />}
      {showLabel && (
        <span className="ml-2">{oscuro ? "Modo claro" : "Modo oscuro"}</span>
      )}
    </button>
  );
}
