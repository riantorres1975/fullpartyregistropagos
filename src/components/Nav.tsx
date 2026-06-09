"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import {
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

  const esActivo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const iniciales =
    (nombre.replace(/[^a-zA-Z]/g, "").slice(0, 2) || "U").toUpperCase();
  const nombreBonito = nombre.charAt(0).toUpperCase() + nombre.slice(1);

  const degradado =
    "bg-[linear-gradient(115deg,#3b1578_0%,#6d28d9_48%,#db2777_115%)]";

  return (
    <>
      {/* Header "hero" tipo Spin: avatar + saludo + opciones. Esquinas
          inferiores redondeadas en móvil para que la tarjeta de abajo se
          recargue sobre él. */}
      <header
        className={`${degradado} rounded-b-[28px] text-white shadow-lg shadow-violet-950/20 sm:sticky sm:top-0 sm:z-40 sm:rounded-none`}
      >
        <div className="mx-auto max-w-5xl px-4 pt-4 pb-6 sm:py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20 font-display text-sm font-bold ring-2 ring-white/30">
                {iniciales}
              </span>
              <div className="min-w-0">
                <p className="text-xs opacity-90">¡Qué gusto verte!</p>
                <p className="truncate font-display text-lg font-extrabold leading-tight">
                  {nombreBonito}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ThemeToggle />
              <button
                onClick={logout}
                aria-label="Cerrar sesión"
                className="flex items-center justify-center rounded-full bg-white/15 p-2.5 hover:bg-white/25"
              >
                <IconLogout className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Menú en escritorio (en móvil va abajo). */}
          <nav className="mt-3 hidden gap-1 sm:flex">
            {links.map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  esActivo(href) ? "bg-white/25" : "hover:bg-white/15"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Barra inferior tipo Spin (móvil): blanca, limpia, ítem activo en violeta. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-200 bg-white px-1 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] dark:border-slate-700 dark:bg-slate-900 sm:hidden">
        {links.map(({ href, label, Icon }) => {
          const activo = esActivo(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-center text-[10px] font-medium leading-tight transition-colors ${
                activo
                  ? "text-violet-600 dark:text-violet-400"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                  activo ? "bg-violet-100 dark:bg-violet-500/20" : ""
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
