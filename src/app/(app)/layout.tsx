import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Nav from "@/components/Nav";
import SWRProvider from "@/components/SWRProvider";
import PinGate from "@/components/PinGate";
import { Toaster } from "@/lib/toast";
import { IconLock } from "@/components/icons";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await getSession();
  if (!sesion) redirect("/login");

  const nombre = sesion.email.split("@")[0];

  return (
    <PinGate>
      <SWRProvider>
        <Nav nombre={nombre} />
        <main className="mx-auto w-full max-w-5xl flex-1 p-4">{children}</main>
        <footer className="flex items-center justify-center gap-1.5 py-6 text-center text-xs text-slate-400">
          <IconLock className="h-3.5 w-3.5" /> Datos cifrados · Full Party
        </footer>
        <Toaster />
      </SWRProvider>
    </PinGate>
  );
}
