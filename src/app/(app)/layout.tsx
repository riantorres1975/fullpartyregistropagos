import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Nav from "@/components/Nav";
import { Toaster } from "@/lib/toast";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSession();
  if (!sesion) redirect("/login");

  const nombre = sesion.email.split("@")[0];

  return (
    <>
      <Nav nombre={nombre} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
      <footer className="py-6 text-center text-xs text-slate-400">
        🔒 Datos cifrados · Full Party 🎈
      </footer>
      <Toaster />
    </>
  );
}
