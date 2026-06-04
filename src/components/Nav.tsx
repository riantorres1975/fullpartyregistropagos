"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

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
    <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">💳 Mis Transferencias</span>
          <button onClick={logout} className="text-sm underline sm:hidden">
            Salir
          </button>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const activo =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activo ? "bg-white/25" : "hover:bg-white/15"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <span className="ml-3 hidden text-sm opacity-90 sm:inline">
            👋 {nombre}
          </span>
          <button
            onClick={logout}
            className="ml-2 hidden rounded-lg bg-white/15 px-3 py-1.5 text-sm hover:bg-white/25 sm:inline"
          >
            Salir
          </button>
        </nav>
      </div>
    </header>
  );
}
