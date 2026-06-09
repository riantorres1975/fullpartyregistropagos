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

  return (
    <header className="sticky top-0 z-40 bg-[linear-gradient(115deg,#3b1578_0%,#6d28d9_48%,#db2777_115%)] text-white shadow-lg shadow-violet-950/20">
      <div className="mx-auto max-w-5xl px-3 py-2.5 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 font-display text-base font-extrabold tracking-tight sm:text-lg">
            <IconCard className="h-5 w-5" />
            Mis Transferencias
          </span>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm opacity-90 sm:inline">{nombre}</span>
            <ThemeToggle />
            <button
              onClick={logout}
              className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-sm hover:bg-white/25"
            >
              <IconLogout className="h-4 w-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
        {/* En móvil, el menú va FIJO abajo (más cómodo para el pulgar);
            en escritorio queda aquí arriba dentro del encabezado. */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-white/15 bg-[linear-gradient(115deg,#3b1578_0%,#6d28d9_48%,#db2777_115%)] px-1.5 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] text-white shadow-[0_-4px_14px_rgba(0,0,0,0.2)] sm:static sm:mt-2 sm:border-0 sm:bg-none sm:px-0 sm:pb-0 sm:pt-0 sm:shadow-none"
        >
          {links.map(({ href, label, Icon }) => {
            const activo =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
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
          })}
        </nav>
      </div>
    </header>
  );
}
