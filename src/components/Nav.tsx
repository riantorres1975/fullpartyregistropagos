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
} from "@/components/icons";

const links = [
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/transferencias", label: "Transferencias", Icon: IconTransfer },
  { href: "/clientes", label: "Clientes", Icon: IconUsers },
  { href: "/reportes", label: "Reportes", Icon: IconChart },
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
        <nav className="mt-2 flex gap-1">
          {links.map(({ href, label, Icon }) => {
            const activo =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-center text-[11px] font-medium leading-tight transition-colors sm:flex-initial sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm ${
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
