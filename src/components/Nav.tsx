"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import {
  IconCard,
  IconHome,
  IconTransfer,
  IconUsers,
  IconChart,
  IconLogout,
  IconSettings,
  IconTrashBin,
} from "@/components/icons";

const links = [
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/transferencias", label: "Transferencias", Icon: IconTransfer },
  { href: "/clientes", label: "Clientes", Icon: IconUsers },
  { href: "/reportes", label: "Reportes", Icon: IconChart },
  { href: "/papelera", label: "Papelera", Icon: IconTrashBin },
  { href: "/ajustes", label: "Ajustes", Icon: IconSettings },
];

export default function Nav({ nombre }: { nombre: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  const enlaces = links.map(({ href, label, Icon }) => {
    const activo = href === "/" ? pathname === "/" : pathname.startsWith(href);
    return (
      <Link
        key={href}
        href={href}
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-0.5 py-1.5 text-center text-[10px] font-medium leading-tight transition-colors sm:flex-initial sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm ${
          activo ? "bg-white/25" : "hover:bg-white/15"
        }`}
      >
        <Icon className="h-5 w-5 sm:h-4 sm:w-4" />
        <span>{label}</span>
      </Link>
    );
  });

  const degradado =
    "bg-[linear-gradient(115deg,#3b1578_0%,#6d28d9_48%,#db2777_115%)]";

  return (
    <>
      {/* Escritorio: encabezado fijo arriba (marca + opciones + menú). */}
      <header
        className={`hidden sm:block sm:sticky sm:top-0 sm:z-40 ${degradado} text-white shadow-lg shadow-violet-950/20`}
      >
        <div className="mx-auto max-w-5xl px-4 py-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
              <IconCard className="h-5 w-5" />
              Mis Transferencias
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-90">{nombre}</span>
              <ThemeToggle />
              <button
                onClick={logout}
                className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm text-white hover:bg-white/25"
              >
                <IconLogout className="h-4 w-4" /> Salir
              </button>
            </div>
          </div>
          <nav className="mt-2 flex gap-1">{enlaces}</nav>
        </div>
      </header>

      {/* Móvil: TODO abajo. Fila de opciones (marca + tema + salir) y el menú. */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 ${degradado} text-white shadow-[0_-4px_14px_rgba(0,0,0,0.2)] pb-[max(0.375rem,env(safe-area-inset-bottom))] sm:hidden`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-1.5">
          <span className="flex items-center gap-1.5 font-display text-sm font-extrabold tracking-tight">
            <IconCard className="h-4 w-4" />
            Mis Transferencias
          </span>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-2 text-xs text-white hover:bg-white/25"
            >
              <IconLogout className="h-4 w-4" /> Salir
            </button>
          </div>
        </div>
        <nav className="flex gap-1 px-1.5 pt-1.5">{enlaces}</nav>
      </div>
    </>
  );
}
