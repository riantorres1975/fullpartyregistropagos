"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const links = [
  { href: "/", label: "🏠 Inicio" },
  { href: "/transferencias", label: "💸 Transferencias" },
  { href: "/clientes", label: "👥 Clientes" },
  { href: "/reportes", label: "📊 Reportes" },
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
    <header className="sticky top-0 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow">
      <div className="mx-auto max-w-5xl px-3 py-2.5 sm:px-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-bold sm:text-lg">💳 Mis Transferencias</span>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm opacity-90 sm:inline">👋 {nombre}</span>
            <ThemeToggle />
            <button
              onClick={logout}
              className="rounded-lg bg-white/15 px-3 py-2 text-sm hover:bg-white/25"
            >
              Salir
            </button>
          </div>
        </div>
        <nav className="mt-2 flex gap-1 overflow-x-auto pb-1">
          {links.map((l) => {
            const activo =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activo ? "bg-white/25" : "hover:bg-white/15"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
